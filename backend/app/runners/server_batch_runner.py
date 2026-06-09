"""Server batch runner: executes chunked SERVER_PRODUCTION generation sequentially.

Constraints:
- Concurrency fixed to 1 (sequential chunk execution)
- Each chunk count <= SERVER_PRODUCTION_MAX_COUNT
- Total count <= SERVER_BATCH_MAX_TOTAL_COUNT
- All peptides source="server_production", scores remain null
- Artifacts saved under batch artifact_root
- Single job directory with append-only files (candidates.jsonl, candidates.csv, errors.jsonl)
- Progress and checkpoint updated after each chunk
"""
import csv
import json
import math
import shutil
import threading
import time
import traceback
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.config import (
    SERVER_BATCH_ENABLED,
    SERVER_BATCH_MAX_TOTAL_COUNT,
    SERVER_BATCH_CHUNK_SIZE,
    SERVER_ARTIFACT_DIR,
    DISCLAIMER,
)
from app.models.generation_batch import GenerationBatch
from app.models.generation_batch_item import GenerationBatchItem
from app.models.generation_run import GenerationRun
from app.models.task import Task
from app.models.peptide import PeptideCandidate
from app.runners.server_production_runner import run_server_production
from app.db import engine
from sqlalchemy import text


def _create_generation_run_for_chunk(
    db: Session,
    batch: GenerationBatch,
    chunk_index: int,
    chunk_count: int,
) -> tuple[GenerationRun, Task]:
    """Create a generation_run + task for a single chunk."""
    task = Task(
        type="AMP Generation",
        status="PENDING",
        progress=0,
        total=chunk_count,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    run = GenerationRun(
        task_id=task.id,
        mode=batch.mode or "Sequence-based",
        backend="SERVER_PRODUCTION",
        count=chunk_count,
        min_length=batch.min_length,
        max_length=batch.max_length,
        temperature=batch.temperature,
        top_p=batch.top_p,
        status="PENDING",
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run, task


def _update_batch_status(batch: GenerationBatch, db: Session):
    """Recalculate batch status based on items."""
    if batch.status in ("CANCELLED", "CANCEL_REQUESTED"):
        return
    items = (
        db.query(GenerationBatchItem)
        .filter(GenerationBatchItem.batch_id == batch.id)
        .all()
    )
    total = len(items)
    completed = sum(1 for i in items if i.status == "SUCCEEDED")
    failed = sum(1 for i in items if i.status == "FAILED")
    cancelled = sum(1 for i in items if i.status == "CANCELLED")

    batch.completed_chunks = completed
    batch.failed_chunks = failed

    if cancelled > 0 and (completed + failed + cancelled) == total:
        if cancelled == total:
            batch.status = "CANCELLED"
        else:
            batch.status = "PARTIAL"
        batch.completed_at = datetime.utcnow()
        batch.message = f"Batch cancelled. {completed} succeeded, {failed} failed, {cancelled} cancelled."
    elif completed == total:
        batch.status = "SUCCEEDED"
        batch.completed_at = datetime.utcnow()
        batch.message = f"Batch completed. {completed}/{total} chunks succeeded."
    elif failed == total:
        batch.status = "FAILED"
        batch.completed_at = datetime.utcnow()
        batch.message = f"Batch failed. {failed}/{total} chunks failed."
    elif completed + failed > 0:
        batch.status = "PARTIAL" if failed > 0 else "RUNNING"
        batch.message = f"Progress: {completed} succeeded, {failed} failed, {total - completed - failed - cancelled} pending, {cancelled} cancelled."
    else:
        batch.status = "RUNNING"
        batch.message = f"Running {total} chunks sequentially..."

    db.commit()


def _write_manifest(job_dir: Path, batch: GenerationBatch):
    manifest = {
        "batch_id": batch.id,
        "batch_name": batch.batch_name,
        "backend": batch.backend,
        "total_count": batch.total_count,
        "chunk_size": batch.chunk_size,
        "total_chunks": batch.total_chunks,
        "mode": batch.mode,
        "min_length": batch.min_length,
        "max_length": batch.max_length,
        "temperature": batch.temperature,
        "top_p": batch.top_p,
        "created_at": batch.created_at.isoformat() if batch.created_at else None,
        "job_dir": str(job_dir),
        "disclaimer": DISCLAIMER,
    }
    with open(job_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)


def _write_progress(
    job_dir: Path,
    batch: GenerationBatch,
    total_peptides: int,
    elapsed: int = 0,
    final: bool = False,
):
    progress = {
        "batch_id": batch.id,
        "status": batch.status,
        "total_chunks": batch.total_chunks,
        "completed_chunks": batch.completed_chunks,
        "failed_chunks": batch.failed_chunks,
        "total_peptides": total_peptides,
        "elapsed_seconds": elapsed,
        "updated_at": datetime.utcnow().isoformat(),
        "final": final,
    }
    with open(job_dir / "progress.json", "w", encoding="utf-8") as f:
        json.dump(progress, f, indent=2, ensure_ascii=False)


def _write_checkpoint(
    job_dir: Path,
    batch: GenerationBatch,
    next_chunk_index: int,
    final: bool = False,
):
    checkpoint = {
        "batch_id": batch.id,
        "next_chunk_index": next_chunk_index,
        "status": batch.status,
        "updated_at": datetime.utcnow().isoformat(),
        "final": final,
    }
    with open(job_dir / "checkpoint.json", "w", encoding="utf-8") as f:
        json.dump(checkpoint, f, indent=2, ensure_ascii=False)


def _init_candidates_files(job_dir: Path):
    csv_fieldnames = [
        "sequence", "length", "net_charge", "hydrophobic_fraction",
        "hydrophobicity", "valid_aa", "amp_score", "mic_ecoli", "mic_saureus",
        "toxicity_risk", "hemolysis_risk", "status", "chunk_index",
        "generated_at", "disclaimer",
    ]
    with open(job_dir / "candidates.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fieldnames)
        writer.writeheader()
    open(job_dir / "candidates.jsonl", "w", encoding="utf-8").close()
    open(job_dir / "errors.jsonl", "w", encoding="utf-8").close()


def _append_chunk_peptides(
    job_dir: Path,
    db: Session,
    run: GenerationRun,
    chunk_index: int,
):
    """Read peptides from DB for this run and append to candidates.jsonl and candidates.csv."""
    peptides = (
        db.query(PeptideCandidate)
        .filter(PeptideCandidate.generation_run_id == run.id)
        .all()
    )
    if not peptides:
        return 0

    for p in peptides:
        with open(job_dir / "candidates.jsonl", "a", encoding="utf-8") as f:
            json.dump({
                "sequence": p.sequence,
                "length": p.length,
                "net_charge": p.net_charge,
                "hydrophobic_fraction": p.hydrophobic_fraction,
                "amp_score": p.amp_score,
                "mic_ecoli": p.mic_ecoli,
                "mic_saureus": p.mic_saureus,
                "toxicity_risk": p.toxicity_risk,
                "hemolysis_risk": p.hemolysis_risk,
                "status": p.status,
                "chunk_index": chunk_index,
                "generated_at": p.created_at.isoformat() if p.created_at else datetime.utcnow().isoformat(),
                "disclaimer": DISCLAIMER,
            }, f, ensure_ascii=False)
            f.write("\n")

    with open(job_dir / "candidates.csv", "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "sequence", "length", "net_charge", "hydrophobic_fraction",
            "hydrophobicity", "valid_aa", "amp_score", "mic_ecoli", "mic_saureus",
            "toxicity_risk", "hemolysis_risk", "status", "chunk_index",
            "generated_at", "disclaimer",
        ])
        for p in peptides:
            writer.writerow({
                "sequence": p.sequence,
                "length": p.length,
                "net_charge": p.net_charge,
                "hydrophobic_fraction": p.hydrophobic_fraction,
                "hydrophobicity": p.hydrophobicity,
                "valid_aa": p.valid_aa,
                "amp_score": p.amp_score,
                "mic_ecoli": p.mic_ecoli,
                "mic_saureus": p.mic_saureus,
                "toxicity_risk": p.toxicity_risk,
                "hemolysis_risk": p.hemolysis_risk,
                "status": p.status,
                "chunk_index": chunk_index,
                "generated_at": p.created_at.isoformat() if p.created_at else datetime.utcnow().isoformat(),
                "disclaimer": DISCLAIMER,
            })

    return len(peptides)


def _append_error(job_dir: Path, chunk_index: int, message: str):
    with open(job_dir / "errors.jsonl", "a", encoding="utf-8") as f:
        json.dump({
            "chunk_index": chunk_index,
            "error": message,
            "timestamp": datetime.utcnow().isoformat(),
        }, f, ensure_ascii=False)
        f.write("\n")


def _worker(batch_id: int):
    db = SessionLocal()
    try:
        batch = db.query(GenerationBatch).filter(GenerationBatch.id == batch_id).first()
        if not batch:
            return

        batch.status = "RUNNING"
        batch.started_at = datetime.utcnow()
        db.commit()

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        job_dir = SERVER_ARTIFACT_DIR / "jobs" / f"job-{batch.id}-{timestamp}"
        job_dir.mkdir(parents=True, exist_ok=True)
        batch.artifact_root = str(job_dir)
        db.commit()

        _write_manifest(job_dir, batch)
        _init_candidates_files(job_dir)
        _write_progress(job_dir, batch, total_peptides=0, elapsed=0)
        _write_checkpoint(job_dir, batch, next_chunk_index=0)

        start_time = time.time()
        total_peptides = 0

        items = (
            db.query(GenerationBatchItem)
            .filter(GenerationBatchItem.batch_id == batch_id)
            .order_by(GenerationBatchItem.chunk_index.asc())
            .all()
        )

        for item in items:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT status FROM generation_batches WHERE id = :id"), {"id": batch_id})
                row = result.fetchone()
                current_status = row[0] if row else None
            if current_status in ("CANCELLED", "CANCEL_REQUESTED"):
                batch = db.query(GenerationBatch).filter(GenerationBatch.id == batch_id).first()
                batch.status = current_status
                db.commit()
                item.status = "CANCELLED"
                item.message = "Batch cancelled before this chunk started."
                db.commit()
                _update_batch_status(batch, db)
                elapsed = int(time.time() - start_time)
                _write_progress(job_dir, batch, total_peptides, elapsed=elapsed)
                _write_checkpoint(job_dir, batch, next_chunk_index=item.chunk_index)
                continue

            run, task = _create_generation_run_for_chunk(db, batch, item.chunk_index, item.requested_count)
            item.generation_run_id = run.id
            item.task_id = task.id
            item.status = "RUNNING"
            db.commit()

            chunk_tmp_dir = job_dir / "tmp" / f"chunk-{item.chunk_index:04d}"
            chunk_tmp_dir.mkdir(parents=True, exist_ok=True)
            chunk_output_csv = chunk_tmp_dir / "generated_sequences.csv"
            try:
                result = run_server_production(db, run, artifact_dir=chunk_tmp_dir, output_csv=chunk_output_csv)
            except Exception as e:
                result = {"status": "FAILED", "message": str(e)}

            if result["status"] == "SUCCEEDED":
                added = _append_chunk_peptides(job_dir, db, run, item.chunk_index)
                total_peptides += added
                item.status = "SUCCEEDED"
                item.generated_count = result.get("generated_count", added)
                item.message = result.get("message", "Chunk succeeded.")
                item.completed_at = datetime.utcnow()
                item.artifact_dir = str(job_dir)
                try:
                    chunk_output_csv.unlink()
                except Exception:
                    pass
                try:
                    import shutil
                    shutil.rmtree(chunk_tmp_dir, ignore_errors=True)
                except Exception:
                    pass
            elif result["status"] == "CANCELLED":
                item.status = "CANCELLED"
                item.message = "Chunk cancelled."
            else:
                item.status = "FAILED"
                item.message = result.get("message", "Chunk failed.")
                _append_error(job_dir, item.chunk_index, item.message)

            db.commit()
            _update_batch_status(batch, db)
            elapsed = int(time.time() - start_time)
            _write_progress(job_dir, batch, total_peptides, elapsed=elapsed)
            _write_checkpoint(job_dir, batch, next_chunk_index=item.chunk_index + 1)

        _update_batch_status(batch, db)
        elapsed = int(time.time() - start_time)
        _write_progress(job_dir, batch, total_peptides, elapsed=elapsed, final=True)
        _write_checkpoint(job_dir, batch, next_chunk_index=batch.total_chunks, final=True)

    except Exception as e:
        tb = traceback.format_exc()
        try:
            db.rollback()
        except Exception:
            pass
        try:
            batch = db.query(GenerationBatch).filter(GenerationBatch.id == batch_id).first()
            if batch:
                batch.status = "FAILED"
                batch.message = str(e)
                batch.completed_at = datetime.utcnow()
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def start_server_batch(batch_id: int) -> threading.Thread:
    t = threading.Thread(target=_worker, args=(batch_id,), daemon=True)
    t.start()
    return t
