"""Local real smoke runner: invokes actual AMPGen scripts on this machine.

Constraints:
- count <= LOCAL_REAL_SMOKE_MAX_COUNT (default 2)
- GPU/CPU device configurable via AMPGEN_LOCAL_REAL_SMOKE_DEVICE env var (default: cpu)
- Saves stdout, stderr, artifact CSV, and FASTA to artifact_dir.
"""
import csv
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session

from app.config import (
    AMPGEN_LOCAL_REAL_SMOKE_DEVICE,
    AMPGEN_ROOT,
    ARTIFACT_DIR,
    LOCAL_REAL_SMOKE_MAX_COUNT,
    DISCLAIMER,
)
from app.models.task import Task
from app.models.generation_run import GenerationRun
from app.models.peptide import PeptideCandidate
from app.services.physicochemical import apply_amp_filter, check_invalid_aa

AMPGEN_GENERATOR_DIR = AMPGEN_ROOT / "AMP_generator"


def _resolve_msa_directory() -> Path:
    # Prefer example MSA directory if it contains valid .a3m files
    example_dir = AMPGEN_ROOT / "data" / "example" / "msa_files"
    if example_dir.exists() and any(example_dir.glob("*.a3m")):
        return example_dir
    # Fallback: scan data recursively for first directory with .a3m files
    data_dir = AMPGEN_ROOT / "data"
    if data_dir.exists():
        for d in data_dir.rglob("*"):
            if d.is_dir() and any(d.glob("*.a3m")):
                return d
    return example_dir


def run_local_real_smoke(db: Session, run: GenerationRun) -> dict:
    if run.count > LOCAL_REAL_SMOKE_MAX_COUNT:
        return {
            "status": "BLOCKED",
            "message": (
                f"LOCAL_REAL_SMOKE backend is limited to {LOCAL_REAL_SMOKE_MAX_COUNT} peptides. "
                f"Requested {run.count}. Use LOCAL_DEMO for larger batches or connect a server."
            ),
        }

    task = db.query(Task).filter(Task.id == run.task_id).first() if run.task_id else None
    if task:
        task.status = "RUNNING"
        db.commit()

    # Prepare artifact directory
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    artifact_subdir = ARTIFACT_DIR / f"run_{run.id}_{timestamp}"
    artifact_subdir.mkdir(parents=True, exist_ok=True)

    output_csv = (artifact_subdir / "generated_sequences.csv").resolve()
    stdout_log = artifact_subdir / "stdout.log"
    stderr_log = artifact_subdir / "stderr.log"

    mode = (run.mode or "Sequence-based").strip()

    # Build command based on mode
    if mode == "Sequence-based":
        script = AMPGEN_GENERATOR_DIR / "unconditional_generation.py"
        cmd = [
            sys.executable,
            str(script),
            "--total_sequences", str(run.count),
            "--batch_size", "1",
            "--output_file", str(output_csv),
            "--to_device", AMPGEN_LOCAL_REAL_SMOKE_DEVICE,
        ]
    elif mode == "MSA-based":
        script = AMPGEN_GENERATOR_DIR / "conditional_generation_msa.py"
        msa_dir = _resolve_msa_directory()
        cmd = [
            sys.executable,
            str(script),
            "--directory_path", str(msa_dir),
            "--output_csv_file", str(output_csv),
            "--max_retries", "5",
            "--to_device", AMPGEN_LOCAL_REAL_SMOKE_DEVICE,
            "--total_sequences", str(run.count),
        ]
    elif mode == "MSA-conditional":
        script = AMPGEN_GENERATOR_DIR / "unconditional_generation_msa.py"
        cmd = [
            sys.executable,
            str(script),
            "--total_sequences", str(run.count),
            "--batch_size", "1",
            "--n_sequences", "64",
            "--output_csv_file", str(output_csv),
            "--to_device", AMPGEN_LOCAL_REAL_SMOKE_DEVICE,
        ]
    else:
        return {
            "status": "BLOCKED",
            "message": f"Unknown generation mode: {mode}",
        }

    # Execute subprocess with cancellation support
    proc = None
    try:
        with open(stdout_log, "w", encoding="utf-8") as out_f, open(stderr_log, "w", encoding="utf-8") as err_f:
            proc = subprocess.Popen(
                cmd,
                stdout=out_f,
                stderr=err_f,
                cwd=str(AMPGEN_ROOT),
            )
            if task:
                task.process_pid = proc.pid
                db.commit()

            # Poll loop: check cancellation every 1s
            while proc.poll() is None:
                time.sleep(1)
                if task:
                    db.refresh(task)
                    if task.cancel_requested:
                        proc.terminate()
                        try:
                            proc.wait(timeout=5)
                        except subprocess.TimeoutExpired:
                            proc.kill()
                            proc.wait()
                        # Cancellation handled below after loop
                        break

            # If we broke because of cancellation, proc.returncode may be None or negative
            if task and task.cancel_requested:
                run.status = "CANCELLED"
                run.completed_at = datetime.utcnow()
                task.status = "CANCELLED"
                task.cancelled_at = datetime.utcnow()
                task.completed_at = datetime.utcnow()
                task.message = "Task cancelled by user."
                task.artifact_dir = str(artifact_subdir)
                db.commit()
                return {
                    "status": "CANCELLED",
                    "message": "Task cancelled by user.",
                    "artifact_dir": str(artifact_subdir),
                }

            returncode = proc.returncode

    except subprocess.TimeoutExpired:
        returncode = -1
        with open(stderr_log, "a", encoding="utf-8") as f:
            f.write("\n[ERROR] Subprocess timed out after 600s\n")
    except Exception as e:
        returncode = -1
        with open(stderr_log, "a", encoding="utf-8") as f:
            f.write(f"\n[ERROR] {e}\n")

    if returncode != 0:
        run.status = "FAILED"
        run.completed_at = datetime.utcnow()
        if task:
            task.status = "FAILED"
            task.error_message = f"AMPGen script exited with code {returncode}. See artifact_dir."
            task.artifact_dir = str(artifact_subdir)
        db.commit()
        return {
            "status": "FAILED",
            "message": f"AMPGen script failed with return code {returncode}.",
        }

    # Parse output CSV
    sequences = []
    if output_csv.exists():
        with open(output_csv, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                seq = row.get("Sequence", "").strip()
                if seq:
                    sequences.append(seq)

    # Generate FASTA artifact
    fasta_path = artifact_subdir / "generated_sequences.fasta"
    with open(fasta_path, "w", encoding="utf-8") as f:
        for idx, seq in enumerate(sequences):
            f.write(f">AMP_{idx}|run={run.id}|mode={mode}|disclaimer={DISCLAIMER}\n")
            f.write(f"{seq}\n")

    # Insert peptides into DB
    generated_count = 0
    for seq in sequences:
        filter_result = apply_amp_filter(seq)
        if filter_result["passed"]:
            status = "CANDIDATE"
        elif check_invalid_aa(seq):
            status = "REJECTED"
        else:
            status = "FILTERED"

        peptide = PeptideCandidate(
            sequence=seq,
            length=filter_result["length"],
            net_charge=filter_result["net_charge"],
            hydrophobic_fraction=filter_result["hydrophobic_fraction"],
            hydrophobicity=filter_result["hydrophobicity"],
            valid_aa=filter_result["valid_aa"],
            amp_score=None,
            mic_ecoli=None,
            mic_saureus=None,
            toxicity_risk=None,
            hemolysis_risk=None,
            status=status,
            source="local_real_smoke",
            generation_run_id=run.id,
            notes=f"Local real smoke run ({mode}). {DISCLAIMER}",
        )
        db.add(peptide)
        generated_count += 1

    db.commit()

    run.status = "SUCCEEDED"
    run.completed_at = datetime.utcnow()
    db.commit()

    if task:
        task.status = "SUCCEEDED"
        task.progress = generated_count
        task.total = run.count
        task.completed_at = datetime.utcnow()
        task.message = f"Generated {generated_count} peptides via LOCAL_REAL_SMOKE ({mode})."
        task.artifact_dir = str(artifact_subdir)
        db.commit()

    return {
        "status": "SUCCEEDED",
        "message": f"Generated {generated_count} peptides via real AMPGen ({mode}).",
        "artifact_dir": str(artifact_subdir),
    }
