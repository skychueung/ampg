"""Server batch runner: executes chunked SERVER_PRODUCTION generation sequentially.

Constraints:
- Concurrency fixed to 1 (sequential chunk execution)
- Each chunk count <= SERVER_PRODUCTION_MAX_COUNT
- Total count <= SERVER_BATCH_MAX_TOTAL_COUNT
- All peptides source="server_production", scores remain null
- Artifacts saved under batch artifact_root
"""
import math
import threading
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
)
from app.models.generation_batch import GenerationBatch
from app.models.generation_batch_item import GenerationBatchItem
from app.models.generation_run import GenerationRun
from app.models.task import Task
from app.models.peptide import PeptideCandidate
from app.runners.server_production_runner import run_server_production


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
    items = (
        db.query(GenerationBatchItem)
        .filter(GenerationBatchItem.batch_id == batch.id)
        .all()
    )
    total = len(items)
    completed = sum(1 for i in items if i.status == "SUCCEEDED")
    failed = sum(1 for i in items if i.status == "FAILED")

    batch.completed_chunks = completed
    batch.failed_chunks = failed

    if completed == total:
        batch.status = "SUCCEEDED"
        batch.completed_at = datetime.utcnow()
        batch.message = f"Batch completed. {completed}/{total} chunks succeeded."
    elif failed == total:
        batch.status = "FAILED"
        batch.completed_at = datetime.utcnow()
        batch.message = f"Batch failed. {failed}/{total} chunks failed."
    elif completed + failed > 0:
        batch.status = "PARTIAL" if failed > 0 else "RUNNING"
        batch.message = f"Progress: {completed} succeeded, {failed} failed, {total - completed - failed} pending."
    else:
        batch.status = "RUNNING"
        batch.message = f"Running {total} chunks sequentially..."

    db.commit()


def _worker(batch_id: int):
    db = SessionLocal()
    try:
        batch = db.query(GenerationBatch).filter(GenerationBatch.id == batch_id).first()
        if not batch:
            return

        batch.status = "RUNNING"
        batch.started_at = datetime.utcnow()
        db.commit()

        items = (
            db.query(GenerationBatchItem)
            .filter(GenerationBatchItem.batch_id == batch_id)
            .order_by(GenerationBatchItem.chunk_index.asc())
            .all()
        )

        for item in items:
            # Check cancellation before each chunk
            db.refresh(batch)
            if batch.status == "CANCELLED":
                item.status = "CANCELLED"
                item.message = "Batch cancelled before this chunk started."
                db.commit()
                continue

            # Create generation_run + task for this chunk
            run, task = _create_generation_run_for_chunk(db, batch, item.chunk_index, item.requested_count)
            item.generation_run_id = run.id
            item.task_id = task.id
            item.status = "RUNNING"
            db.commit()

            # Execute runner
            try:
                result = run_server_production(db, run)
            except Exception as e:
                result = {"status": "FAILED", "message": str(e)}

            # Update item status
            if result["status"] == "SUCCEEDED":
                item.status = "SUCCEEDED"
                item.generated_count = result.get("generated_count", item.requested_count)
                item.artifact_dir = result.get("artifact_dir")
                item.message = result.get("message", "Chunk succeeded.")
                item.completed_at = datetime.utcnow()
            elif result["status"] == "CANCELLED":
                item.status = "CANCELLED"
                item.message = "Chunk cancelled."
            else:
                item.status = "FAILED"
                item.message = result.get("message", "Chunk failed.")

            db.commit()
            _update_batch_status(batch, db)

        # Final status update
        _update_batch_status(batch, db)

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
