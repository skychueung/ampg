from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate
from app.config import DISCLAIMER

router = APIRouter(prefix="/tasks")


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
    return q.order_by(Task.id.desc()).offset(skip).limit(limit).all()


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


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
