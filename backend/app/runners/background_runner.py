"""Background task runner using threading.

No Celery/Redis/RQ required. Each task runs in a daemon thread.
"""
import threading
import traceback
from datetime import datetime

from app.db import SessionLocal
from app.models.task import Task
from app.models.generation_run import GenerationRun
from app.runners.local_real_smoke_runner import run_local_real_smoke
from app.runners.local_demo_runner import run_local_demo_generation


def _worker(run_id: int, task_id: int, backend: str):
    db = SessionLocal()
    try:
        run = db.query(GenerationRun).filter(GenerationRun.id == run_id).first()
        task = db.query(Task).filter(Task.id == task_id).first() if task_id else None

        if not run:
            return

        # Transition to RUNNING
        run.status = "RUNNING"
        db.commit()

        if task:
            task.status = "RUNNING"
            task.message = f"Running {backend} generation in background..."
            db.commit()

        # Execute runner
        if backend == "LOCAL_REAL_SMOKE":
            result = run_local_real_smoke(db, run)
        elif backend == "LOCAL_DEMO":
            result = run_local_demo_generation(db, run)
        else:
            if task:
                task.status = "BLOCKED"
                task.message = "Unknown backend for background execution."
                db.commit()
            run.status = "BLOCKED"
            db.commit()
            return

        # Runner already updates SUCCEEDED/FAILED/BLOCKED/CANCELLED status internally.
        # Log unexpected statuses just in case.
        if result["status"] not in ("SUCCEEDED", "FAILED", "BLOCKED", "CANCELLED"):
            if task:
                task.status = "FAILED"
                task.error_message = f"Unexpected runner status: {result['status']}"
                db.commit()
            run.status = "FAILED"
            db.commit()

    except Exception as e:
        tb = traceback.format_exc()
        try:
            db.rollback()
        except Exception:
            pass
        try:
            if task:
                task.status = "FAILED"
                task.error_message = str(e)
                current_log = task.log_text or ""
                task.log_text = current_log + f"\n[ERROR] {tb}"
                db.commit()
        except Exception:
            pass
        try:
            run = db.query(GenerationRun).filter(GenerationRun.id == run_id).first()
            if run:
                run.status = "FAILED"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def start_generation_background(run_id: int, task_id: int, backend: str) -> threading.Thread:
    t = threading.Thread(target=_worker, args=(run_id, task_id, backend), daemon=True)
    t.start()
    return t
