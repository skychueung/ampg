from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.generation_run import GenerationRun
from app.models.task import Task
from app.models.peptide import PeptideCandidate
from app.schemas.generation import GenerationRunCreate, GenerationRunOut, GenerationRunDetailOut
from app.runners.background_runner import start_generation_background
from app.runners.ampgen_runner import placeholder_ampgen_run
from app.config import LOCAL_DEMO_MAX_COUNT, LOCAL_REAL_SMOKE_MAX_COUNT, DISCLAIMER

router = APIRouter(prefix="/generation-runs")


@router.post("", response_model=GenerationRunOut)
def create_generation_run(payload: GenerationRunCreate, db: Session = Depends(get_db)):
    backend = (payload.backend or "LOCAL_DEMO").strip().upper()
    count = payload.count or 5

    # Create task record
    task = Task(
        type="AMP Generation",
        status="PENDING",
        progress=0,
        total=count,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    run = GenerationRun(
        task_id=task.id,
        mode=payload.mode,
        backend=backend,
        count=count,
        min_length=payload.min_length,
        max_length=payload.max_length,
        temperature=payload.temperature,
        top_p=payload.top_p,
        status="PENDING",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    if backend == "LOCAL_REAL_SMOKE":
        if count > LOCAL_REAL_SMOKE_MAX_COUNT:
            task.status = "BLOCKED"
            run.status = "BLOCKED"
            task.message = (
                f"LOCAL_REAL_SMOKE backend is limited to {LOCAL_REAL_SMOKE_MAX_COUNT} peptides. "
                f"Requested {count}. Use LOCAL_DEMO for larger batches or connect a server."
            )
            db.commit()
            return run
        # Start background execution
        start_generation_background(run.id, task.id, backend)
        return run

    elif backend == "LOCAL_DEMO":
        if count > LOCAL_DEMO_MAX_COUNT:
            task.status = "BLOCKED"
            run.status = "BLOCKED"
            task.message = (
                f"LOCAL_DEMO backend is limited to {LOCAL_DEMO_MAX_COUNT} peptides. "
                f"Requested {count}. Use LOCAL_REAL_SMOKE (max {LOCAL_REAL_SMOKE_MAX_COUNT}) for real runs."
            )
            db.commit()
            return run
        # Start background execution
        start_generation_background(run.id, task.id, backend)
        return run

    else:
        # SERVER_PRODUCTION or anything else
        result = placeholder_ampgen_run()
        task.status = "BLOCKED"
        run.status = "BLOCKED"
        task.message = result["message"]
        db.commit()
        return run


@router.get("", response_model=list[GenerationRunOut])
def list_generation_runs(db: Session = Depends(get_db)):
    return db.query(GenerationRun).order_by(GenerationRun.id.desc()).all()


@router.get("/{run_id}", response_model=GenerationRunOut)
def get_generation_run(run_id: int, db: Session = Depends(get_db)):
    run = db.query(GenerationRun).filter(GenerationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Generation run not found")
    return run


@router.get("/{run_id}/peptides", response_model=GenerationRunDetailOut)
def get_generation_run_peptides(run_id: int, db: Session = Depends(get_db)):
    run = db.query(GenerationRun).filter(GenerationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Generation run not found")
    peptides = db.query(PeptideCandidate).filter(PeptideCandidate.generation_run_id == run_id).all()
    return {
        "id": run.id,
        "task_id": run.task_id,
        "mode": run.mode,
        "backend": run.backend,
        "count": run.count,
        "min_length": run.min_length,
        "max_length": run.max_length,
        "temperature": run.temperature,
        "top_p": run.top_p,
        "status": run.status,
        "created_at": run.created_at,
        "completed_at": run.completed_at,
        "peptides": peptides,
        "disclaimer": DISCLAIMER,
    }
