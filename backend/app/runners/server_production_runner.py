"""Server production runner: invokes actual AMPGen scripts on server GPU.

Constraints:
- count <= SERVER_PRODUCTION_MAX_COUNT (default 10)
- GPU device configurable via AMPGEN_SERVER_PRODUCTION_DEVICE env var (default: cpu)
- Artifacts saved to SERVER_ARTIFACT_DIR (should be on large partition, e.g. /mnt/sdb)
- Source tag: "server_production"
"""
import csv
import subprocess
import os
import sys

import time
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session

from app.config import (
    AMPGEN_SERVER_PRODUCTION_DEVICE,
    AMPGEN_ROOT,
    SERVER_ARTIFACT_DIR,
    SERVER_PRODUCTION_MAX_COUNT,
    SERVER_PRODUCTION_ENABLED,
    DISCLAIMER,
)
from app.models.task import Task
from app.models.generation_run import GenerationRun
from app.models.peptide import PeptideCandidate
from app.services.physicochemical import apply_amp_filter, check_invalid_aa
from app.config import AMPGEN_PYTHON_EXECUTABLE

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


def run_server_production(db: Session, run: GenerationRun) -> dict:
    if not SERVER_PRODUCTION_ENABLED:
        return {
            "status": "BLOCKED",
            "message": (
                "Server production backend is not enabled. "
                "Set SERVER_PRODUCTION_ENABLED=true and configure SERVER_ARTIFACT_DIR."
            ),
        }

    if run.count > SERVER_PRODUCTION_MAX_COUNT:
        return {
            "status": "BLOCKED",
            "message": (
                f"SERVER_PRODUCTION backend is limited to {SERVER_PRODUCTION_MAX_COUNT} peptides. "
                f"Requested {run.count}."
            ),
        }

    task = db.query(Task).filter(Task.id == run.task_id).first() if run.task_id else None
    if task:
        task.status = "RUNNING"
        db.commit()

    # Prepare artifact directory
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    artifact_subdir = SERVER_ARTIFACT_DIR / f"run_{run.id}_{timestamp}"
    artifact_subdir.mkdir(parents=True, exist_ok=True)

    output_csv = (artifact_subdir / "generated_sequences.csv").resolve()
    stdout_log = artifact_subdir / "stdout.log"
    stderr_log = artifact_subdir / "stderr.log"

    mode = (run.mode or "Sequence-based").strip()

    # Build command based on mode
    if mode == "Sequence-based":
        script = AMPGEN_GENERATOR_DIR / "unconditional_generation.py"
        cmd = [
            AMPGEN_PYTHON_EXECUTABLE,
            str(script),
            "--total_sequences", str(run.count),
            "--batch_size", "1",
            "--output_file", str(output_csv),
            "--to_device", AMPGEN_SERVER_PRODUCTION_DEVICE,
        ]
    elif mode == "MSA-based":
        script = AMPGEN_GENERATOR_DIR / "conditional_generation_msa.py"
        msa_dir = _resolve_msa_directory()
        cmd = [
            AMPGEN_PYTHON_EXECUTABLE,
            str(script),
            "--directory_path", str(msa_dir),
            "--output_csv_file", str(output_csv),
            "--max_retries", "5",
            "--to_device", AMPGEN_SERVER_PRODUCTION_DEVICE,
            "--total_sequences", str(run.count),
        ]
    elif mode == "MSA-conditional":
        script = AMPGEN_GENERATOR_DIR / "unconditional_generation_msa.py"
        cmd = [
            AMPGEN_PYTHON_EXECUTABLE,
            str(script),
            "--total_sequences", str(run.count),
            "--batch_size", "1",
            "--n_sequences", "64",
            "--output_csv_file", str(output_csv),
            "--to_device", AMPGEN_SERVER_PRODUCTION_DEVICE,
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
            popen_kwargs = {}
            if sys.platform != "win32":
                popen_kwargs["start_new_session"] = True
            proc = subprocess.Popen(
                cmd,
                stdout=out_f,
                stderr=err_f,
                cwd=str(AMPGEN_ROOT),
                **popen_kwargs,
            )
            if task:
                task.process_pid = proc.pid
                db.commit()

            # Poll loop: check cancellation every 1s
            max_polls = 600  # 600 seconds = 10 minutes
            polls = 0
            returncode = None
            while proc.poll() is None:
                time.sleep(1)
                polls += 1
                if polls >= max_polls:
                    proc.kill()
                    proc.wait()
                    with open(stderr_log, "a", encoding="utf-8") as f:
                        f.write("\n[ERROR] Subprocess poll timeout after 600s\n")
                    returncode = -1
                    break
                if task:
                    db.refresh(task)
                    if task.cancel_requested:
                        proc.terminate()
                        try:
                            proc.wait(timeout=5)
                        except subprocess.TimeoutExpired:
                            proc.kill()
                            proc.wait()
                        break

            # If we broke because of cancellation
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

            if returncode is None:
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
            source="server_production",
            generation_run_id=run.id,
            notes=f"Server production run ({mode}). {DISCLAIMER}",
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
        task.message = f"Generated {generated_count} peptides via SERVER_PRODUCTION ({mode})."
        task.artifact_dir = str(artifact_subdir)
        db.commit()

    return {
        "status": "SUCCEEDED",
        "message": f"Generated {generated_count} peptides via server production ({mode}).",
        "artifact_dir": str(artifact_subdir),
    }
