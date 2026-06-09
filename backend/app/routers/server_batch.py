import math
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db import get_db
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
from app.models.peptide import PeptideCandidate
from app.schemas.server_batch import (
    ServerBatchCreate,
    ServerBatchOut,
    ServerBatchDetailOut,
    ServerBatchPeptidesOut,
    ServerBatchArtifactsOut,
)
from app.runners.server_batch_runner import start_server_batch

router = APIRouter(prefix="/server-batches")


@router.post("", response_model=ServerBatchOut)
def create_server_batch(payload: ServerBatchCreate, db: Session = Depends(get_db)):
    if not SERVER_BATCH_ENABLED:
        raise HTTPException(status_code=403, detail="Server batch mode is not enabled.")

    if payload.backend != "SERVER_PRODUCTION":
        raise HTTPException(status_code=400, detail="Only SERVER_PRODUCTION backend is supported for batch mode.")


    # --- Prevent concurrent active batches ---
    existing_active = db.query(GenerationBatch).filter(
        GenerationBatch.status.in_(["RUNNING", "PENDING", "CANCEL_REQUESTED"])
    ).first()
    if existing_active:
        raise HTTPException(
            status_code=409,
            detail=f"Existing active or stale batch (id={existing_active.id}, status={existing_active.status}) requires cleanup before starting a new production batch."
        )
    # --- End prevent concurrent active batches ---

    if payload.total_count > SERVER_BATCH_MAX_TOTAL_COUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Total count exceeds batch limit of {SERVER_BATCH_MAX_TOTAL_COUNT}. Requested {payload.total_count}.",
        )

    total_chunks = math.ceil(payload.total_count / SERVER_BATCH_CHUNK_SIZE)

    batch = GenerationBatch(
        batch_name=payload.batch_name,
        backend=payload.backend,
        total_count=payload.total_count,
        chunk_size=SERVER_BATCH_CHUNK_SIZE,
        total_chunks=total_chunks,
        completed_chunks=0,
        failed_chunks=0,
        status="PENDING",
        mode=payload.mode,
        min_length=payload.min_length,
        max_length=payload.max_length,
        temperature=payload.temperature,
        top_p=payload.top_p,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # Create chunk items
    remaining = payload.total_count
    for idx in range(total_chunks):
        chunk_count = min(SERVER_BATCH_CHUNK_SIZE, remaining)
        remaining -= chunk_count
        item = GenerationBatchItem(
            batch_id=batch.id,
            chunk_index=idx,
            requested_count=chunk_count,
            generated_count=0,
            status="PENDING",
        )
        db.add(item)

    db.commit()

    # Start background execution
    start_server_batch(batch.id)

    return batch


@router.get("", response_model=list[ServerBatchOut])
def list_server_batches(db: Session = Depends(get_db)):
    return db.query(GenerationBatch).order_by(desc(GenerationBatch.id)).all()


@router.get("/{batch_id}", response_model=ServerBatchDetailOut)
def get_server_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(GenerationBatch).filter(GenerationBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    items = (
        db.query(GenerationBatchItem)
        .filter(GenerationBatchItem.batch_id == batch_id)
        .order_by(GenerationBatchItem.chunk_index.asc())
        .all()
    )
    return ServerBatchDetailOut(
        **{
            c.name: getattr(batch, c.name)
            for c in batch.__table__.columns
        },
        items=items,
    )


@router.get("/{batch_id}/peptides", response_model=ServerBatchPeptidesOut)
def get_server_batch_peptides(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(GenerationBatch).filter(GenerationBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    items = (
        db.query(GenerationBatchItem)
        .filter(GenerationBatchItem.batch_id == batch_id)
        .all()
    )

    run_ids = [item.generation_run_id for item in items if item.generation_run_id]
    peptides = []
    if run_ids:
        peptides = (
            db.query(PeptideCandidate)
            .filter(PeptideCandidate.generation_run_id.in_(run_ids))
            .all()
        )

    peptide_dicts = []
    for p in peptides:
        peptide_dicts.append({
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
        })

    return ServerBatchPeptidesOut(
        batch_id=batch_id,
        total_peptides=len(peptide_dicts),
        peptides=peptide_dicts,
        disclaimer=DISCLAIMER,
    )


@router.get("/{batch_id}/artifacts", response_model=ServerBatchArtifactsOut)
def get_server_batch_artifacts(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(GenerationBatch).filter(GenerationBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    items = (
        db.query(GenerationBatchItem)
        .filter(GenerationBatchItem.batch_id == batch_id)
        .all()
    )

    chunks = []
    for item in items:
        chunk_info = {
            "chunk_index": item.chunk_index,
            "status": item.status,
            "artifact_dir": item.artifact_dir,
            "generation_run_id": item.generation_run_id,
        }
        # List artifact files if dir exists
        if item.artifact_dir:
            from pathlib import Path
            ad = Path(item.artifact_dir)
            if ad.exists():
                files = []
                for fname in ["stdout.log", "stderr.log", "generated_sequences.csv", "generated_sequences.fasta"]:
                    fp = ad / fname
                    if fp.exists():
                        st = fp.stat()
                        files.append({
                            "name": fname,
                            "size_kb": round(st.st_size / 1024, 2),
                            "modified_at": datetime.fromtimestamp(st.st_mtime).isoformat(),
                        })
                chunk_info["files"] = files
            else:
                chunk_info["files"] = []
        else:
            chunk_info["files"] = []
        chunks.append(chunk_info)

    return ServerBatchArtifactsOut(
        batch_id=batch_id,
        artifact_root=batch.artifact_root,
        chunks=chunks,
        message=f"Found {len(chunks)} chunk artifact directories.",
    )


@router.post("/{batch_id}/cancel")
def cancel_server_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(GenerationBatch).filter(GenerationBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if batch.status == "CANCELLED":
        return {"status": "CANCELLED", "message": "Batch already cancelled."}

    if batch.status in ("SUCCEEDED", "FAILED", "PARTIAL"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel batch in {batch.status} status.")

    if batch.status == "RUNNING":
        batch.status = "CANCEL_REQUESTED"
        batch.message = "Cancellation requested. Will stop at next chunk boundary."
        db.commit()
        return {"status": "CANCEL_REQUESTED", "message": "Batch cancellation requested. The runner will stop at the next chunk boundary."}

    # Only PENDING can be cancelled in MVP
    batch.status = "CANCELLED"
    batch.completed_at = datetime.utcnow()
    batch.message = "Batch cancelled by user."
    db.commit()

    # Mark pending items as cancelled
    items = (
        db.query(GenerationBatchItem)
        .filter(GenerationBatchItem.batch_id == batch_id)
        .filter(GenerationBatchItem.status == "PENDING")
        .all()
    )
    for item in items:
        item.status = "CANCELLED"
    db.commit()

    return {"status": "CANCELLED", "message": "Batch cancelled successfully."}
