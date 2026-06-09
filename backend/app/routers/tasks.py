import os
import signal
from pathlib import Path
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.task import Task
from app.models.generation_run import GenerationRun
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate
from app.config import DISCLAIMER

router = APIRouter(prefix="/tasks")


def _task_to_dict(task: Task, db: Session) -> dict:
    """Convert Task ORM to dict enriched with related_generation_run_id."""
    run = db.query(GenerationRun).filter(GenerationRun.task_id == task.id).first()
    result = {c.name: getattr(task, c.name) for c in Task.__table__.columns}
    result["related_generation_run_id"] = run.id if run else None
    return result


@router.get("", response_model=list[TaskOut])
def list_tasks(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(Task)
    if status:
        q = q.filter(Task.status == status)
    tasks = q.order_by(Task.id.desc()).offset(skip).limit(limit).all()
    return [_task_to_dict(t, db) for t in tasks]


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_to_dict(task, db)


@router.get("/{task_id}/logs")
def get_task_logs(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    logs = []
    if task.log_text:
        logs = task.log_text.splitlines()

    # Also read artifact logs if available
    artifact_logs: dict[str, list[str]] = {}
    if task.artifact_dir:
        artifact_dir = Path(task.artifact_dir)
        for fname in ("stdout.log", "stderr.log"):
            fpath = artifact_dir / fname
            if fpath.exists():
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read().strip()
                        if content:
                            lines = content.splitlines()
                            artifact_logs[fname] = lines[-50:]  # last 50 lines
                except Exception:
                    pass

    return {
        "task_id": task_id,
        "logs": logs,
        "artifact_logs": artifact_logs,
        "disclaimer": DISCLAIMER,
    }


@router.post("/{task_id}/cancel")
def cancel_task(task_id: int, db: Session = Depends(get_db)):
    """Request cancellation of a running or pending task.

    Does NOT delete the task record. Sets cancel_requested=True and
    attempts to terminate the subprocess if process_pid is known.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    terminal_statuses = ("SUCCEEDED", "FAILED", "BLOCKED", "CANCELLED")
    if task.status in terminal_statuses:
        return {
            "status": task.status,
            "task_id": task_id,
            "message": f"Task is already in terminal state: {task.status}. No action taken.",
            "disclaimer": DISCLAIMER,
        }

    # Mark cancellation request
    task.cancel_requested = True
    task.cancel_requested_at = datetime.utcnow()
    db.commit()

    # Attempt to terminate subprocess if PID is known
    if task.process_pid:
        try:
            if hasattr(signal, "SIGTERM"):
                os.kill(task.process_pid, signal.SIGTERM)
            else:
                # Windows fallback
                os.kill(task.process_pid, signal.CTRL_BREAK_EVENT if hasattr(signal, "CTRL_BREAK_EVENT") else signal.SIGTERM)
        except (OSError, ProcessLookupError):
            pass  # Process may have already exited

    return {
        "status": "CANCEL_REQUESTED",
        "task_id": task_id,
        "message": "Cancellation requested. The task will stop at the next safe checkpoint.",
        "disclaimer": DISCLAIMER,
    }
