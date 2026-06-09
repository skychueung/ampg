from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.generation_run import GenerationRun
from app.models.task import Task
from app.models.peptide import PeptideCandidate
from app.schemas.generation import (
    GenerationRunCreate,
    GenerationRunOut,
    GenerationRunDetailOut,
    GenerationRunArtifactsOut,
    ArtifactFileOut,
)
from app.runners.background_runner import start_generation_background
from app.config import (
    SERVER_PRODUCTION_ENABLED,
    SERVER_PRODUCTION_MAX_COUNT,
    SERVER_PRODUCTION_SINGLE_RUN_LIMIT,
    DISCLAIMER,
    ARTIFACT_DIR,
    SERVER_ARTIFACT_DIR,
)

router = APIRouter(prefix="/generation-runs")


@router.post("", response_model=GenerationRunOut)
def create_generation_run(payload: GenerationRunCreate, db: Session = Depends(get_db)):
    backend = (payload.backend or "SERVER_PRODUCTION").strip().upper()
    count = payload.count or 5

    if backend != "SERVER_PRODUCTION":
        raise HTTPException(
            status_code=400,
            detail=(
                "AMPGen Server-Only accepts only SERVER_PRODUCTION. "
                "LOCAL_DEMO, LOCAL_REAL_SMOKE, demo, mock, and local modes are disabled."
            ),
        )

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

    if not SERVER_PRODUCTION_ENABLED:
        task.status = "BLOCKED"
        run.status = "BLOCKED"
        task.message = (
            "Server production backend is not enabled. "
            "Set SERVER_PRODUCTION_ENABLED=true and configure SERVER_ARTIFACT_DIR."
        )
        db.commit()
        return run

    if count > SERVER_PRODUCTION_MAX_COUNT:
        task.status = "BLOCKED"
        run.status = "BLOCKED"
        task.message = (
            f"SERVER_PRODUCTION backend is limited to {SERVER_PRODUCTION_MAX_COUNT} peptides. "
            f"Requested {count}."
        )
        db.commit()
        return run

    if count > SERVER_PRODUCTION_SINGLE_RUN_LIMIT:
        task.status = "BLOCKED"
        run.status = "BLOCKED"
        task.message = (
            f"Count {count} exceeds single-run limit ({SERVER_PRODUCTION_SINGLE_RUN_LIMIT}). "
            f"Please use POST /api/v1/server-batches for large batch generation."
        )
        db.commit()
        return run

    start_generation_background(run.id, task.id, backend)
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


@router.get("/{run_id}/artifacts", response_model=GenerationRunArtifactsOut)
def get_generation_run_artifacts(run_id: int, db: Session = Depends(get_db)):
    run = db.query(GenerationRun).filter(GenerationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Generation run not found")

    task = db.query(Task).filter(Task.id == run.task_id).first()
    if not task or not task.artifact_dir:
        return {
            "artifact_dir": task.artifact_dir if task else None,
            "files": [],
            "message": "No artifacts directory configured for this run.",
        }

    artifact_dir = Path(task.artifact_dir)

    # Security: prevent path traversal by ensuring resolved path stays under ARTIFACT_DIR or SERVER_ARTIFACT_DIR
    base_dir = Path(ARTIFACT_DIR).resolve()
    server_base_dir = Path(SERVER_ARTIFACT_DIR).resolve()
    resolved_dir = artifact_dir.resolve()
    under_base = str(resolved_dir).startswith(str(base_dir))
    under_server = str(resolved_dir).startswith(str(server_base_dir))
    if not under_base and not under_server:
        return {
            "artifact_dir": str(artifact_dir),
            "files": [],
            "message": "Invalid artifact directory.",
        }

    if not artifact_dir.exists():
        return {
            "artifact_dir": str(artifact_dir),
            "files": [],
            "message": "Artifacts directory does not exist yet.",
        }

    target_files = [
        "stdout.log",
        "stderr.log",
        "generated_sequences.csv",
        "generated_sequences.fasta",
    ]
    files = []
    for fname in target_files:
        fpath = artifact_dir / fname
        if fpath.exists():
            stat = fpath.stat()
            file_type = "log" if fname.endswith(".log") else "csv" if fname.endswith(".csv") else "fasta"
            files.append(
                ArtifactFileOut(
                    name=fname,
                    exists=True,
                    size_kb=round(stat.st_size / 1024, 2),
                    modified_at=datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    type=file_type,
                )
            )

    return {
        "artifact_dir": str(artifact_dir),
        "files": files,
        "message": f"Found {len(files)} artifact files.",
    }
