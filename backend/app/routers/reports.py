"""Report export router (CSV, FASTA, JSON, Markdown)."""
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.peptide import PeptideCandidate
from app.models.task import Task
from app.models.generation_run import GenerationRun
from app.services.artifact_service import (
    export_candidates_csv,
    export_candidates_fasta,
    build_run_markdown_report,
)
from app.config import DISCLAIMER

router = APIRouter(prefix="/reports")


@router.get("/candidates.csv")
def report_csv(db: Session = Depends(get_db)):
    peptides = db.query(PeptideCandidate).all()
    content = export_candidates_csv(peptides)
    # utf-8-sig for Excel compatibility
    encoded = content.encode("utf-8-sig")
    from fastapi import Response
    return Response(
        content=encoded,
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": "attachment; filename=ampgen_candidates.csv"},
    )


@router.get("/candidates.fasta")
def report_fasta(db: Session = Depends(get_db)):
    peptides = db.query(PeptideCandidate).all()
    content = export_candidates_fasta(peptides)
    from fastapi import Response
    return Response(
        content=content.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=ampgen_candidates.fasta"},
    )


@router.get("/tasks.json")
def report_tasks_json(db: Session = Depends(get_db)):
    tasks = db.query(Task).order_by(Task.id.desc()).all()
    payload = []
    for t in tasks:
        payload.append({
            "id": t.id,
            "type": t.type,
            "status": t.status,
            "progress": t.progress,
            "total": t.total,
            "message": t.message,
            "artifact_dir": t.artifact_dir,
            "error_message": t.error_message,
            "cancel_requested": t.cancel_requested,
            "process_pid": t.process_pid,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "cancelled_at": t.cancelled_at.isoformat() if t.cancelled_at else None,
            "logs_available": bool(t.log_text) or bool(t.artifact_dir),
        })
    return {
        "tasks": payload,
        "total": len(payload),
        "disclaimer": DISCLAIMER,
    }


@router.get("/generation-runs/{run_id}.json")
def report_generation_run_json(run_id: int, db: Session = Depends(get_db)):
    run = db.query(GenerationRun).filter(GenerationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Generation run not found")

    task = db.query(Task).filter(Task.id == run.task_id).first() if run.task_id else None
    peptides = db.query(PeptideCandidate).filter(PeptideCandidate.generation_run_id == run_id).all()

    artifact_dir = task.artifact_dir if task else None
    logs_available = False
    if artifact_dir:
        ad = Path(artifact_dir)
        logs_available = any((ad / f).exists() for f in ("stdout.log", "stderr.log"))

    return {
        "generation_run": {
            "id": run.id,
            "task_id": run.task_id,
            "mode": run.mode,
            "backend": run.backend,
            "count": run.count,
            "status": run.status,
            "created_at": run.created_at.isoformat() if run.created_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        },
        "task": {
            "id": task.id,
            "status": task.status,
            "message": task.message,
            "progress": task.progress,
            "total": task.total,
            "artifact_dir": task.artifact_dir,
            "error_message": task.error_message,
            "cancel_requested": task.cancel_requested,
            "process_pid": task.process_pid,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "cancelled_at": task.cancelled_at.isoformat() if task.cancelled_at else None,
        } if task else None,
        "peptides": [
            {
                "id": p.id,
                "sequence": p.sequence,
                "length": p.length,
                "net_charge": p.net_charge,
                "hydrophobic_fraction": p.hydrophobic_fraction,
                "status": p.status,
                "source": p.source,
                "amp_score": p.amp_score,
                "mic_ecoli": p.mic_ecoli,
                "mic_saureus": p.mic_saureus,
            }
            for p in peptides
        ],
        "scientific_boundary": {
            "computational_only": True,
            "not_experimentally_validated": True,
            "amp_score_not_computed_without_model": True,
            "mic_not_computed_without_model": True,
            "disclaimer": DISCLAIMER,
        },
        "artifact_dir": artifact_dir,
        "logs_available": logs_available,
        "disclaimer": DISCLAIMER,
    }


@router.get("/generation-runs/{run_id}.md")
def report_generation_run_markdown(run_id: int, db: Session = Depends(get_db)):
    run = db.query(GenerationRun).filter(GenerationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Generation run not found")

    task = db.query(Task).filter(Task.id == run.task_id).first() if run.task_id else None
    peptides = db.query(PeptideCandidate).filter(PeptideCandidate.generation_run_id == run_id).all()

    artifact_dir = task.artifact_dir if task else None
    logs_available = False
    if artifact_dir:
        ad = Path(artifact_dir)
        logs_available = any((ad / f).exists() for f in ("stdout.log", "stderr.log"))

    content = build_run_markdown_report(run, task, peptides, artifact_dir, logs_available)
    from fastapi import Response
    return Response(
        content=content.encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=ampgen_run_{run_id}_report.md"},
    )
