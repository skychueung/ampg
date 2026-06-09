"""Dashboard summary and recent runs API."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db import get_db
from app.models.peptide import PeptideCandidate
from app.models.task import Task
from app.models.generation_run import GenerationRun
from app.config import DISCLAIMER

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    """Return real database statistics for the dashboard."""
    peptides_total = db.query(PeptideCandidate).count()
    peptides_candidate = db.query(PeptideCandidate).filter(PeptideCandidate.status == "CANDIDATE").count()
    peptides_filtered = db.query(PeptideCandidate).filter(PeptideCandidate.status == "FILTERED").count()
    peptides_rejected = db.query(PeptideCandidate).filter(PeptideCandidate.status == "REJECTED").count()

    tasks_total = db.query(Task).count()
    tasks_succeeded = db.query(Task).filter(Task.status == "SUCCEEDED").count()
    tasks_failed = db.query(Task).filter(Task.status == "FAILED").count()
    tasks_blocked = db.query(Task).filter(Task.status == "BLOCKED").count()
    tasks_running = db.query(Task).filter(Task.status == "RUNNING").count()

    generation_runs_total = db.query(GenerationRun).count()
    local_demo_runs = db.query(GenerationRun).filter(GenerationRun.backend == "LOCAL_DEMO").count()
    local_real_smoke_runs = db.query(GenerationRun).filter(GenerationRun.backend == "LOCAL_REAL_SMOKE").count()
    server_production_runs = db.query(GenerationRun).filter(GenerationRun.backend == "SERVER_PRODUCTION").count()

    last_run = (
        db.query(GenerationRun)
        .filter(GenerationRun.created_at.isnot(None))
        .order_by(GenerationRun.created_at.desc())
        .first()
    )

    return {
        "peptides_total": peptides_total,
        "peptides_candidate": peptides_candidate,
        "peptides_filtered": peptides_filtered,
        "peptides_rejected": peptides_rejected,
        "tasks_total": tasks_total,
        "tasks_succeeded": tasks_succeeded,
        "tasks_failed": tasks_failed,
        "tasks_blocked": tasks_blocked,
        "tasks_running": tasks_running,
        "generation_runs_total": generation_runs_total,
        "local_demo_runs": local_demo_runs,
        "local_real_smoke_runs": local_real_smoke_runs,
        "server_production_runs": server_production_runs,
        "last_run_at": last_run.created_at.isoformat() if last_run and last_run.created_at else None,
        "disclaimer": DISCLAIMER,
    }


@router.get("/recent-runs")
def dashboard_recent_runs(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """Return recent generation runs with peptide counts."""
    runs = (
        db.query(GenerationRun)
        .order_by(GenerationRun.created_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for run in runs:
        peptide_count = (
            db.query(PeptideCandidate)
            .filter(PeptideCandidate.generation_run_id == run.id)
            .count()
        )
        result.append({
            "run_id": run.id,
            "task_id": run.task_id,
            "backend": run.backend,
            "mode": run.mode,
            "count": run.count,
            "status": run.status,
            "created_at": run.created_at.isoformat() if run.created_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "peptide_count": peptide_count,
            "message": run.status,
        })

    return result
