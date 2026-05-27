"""Candidate Review Workbench router for peptide shortlisting and synthesis planning.

All data from real SQLite. No demo data, no fake scores.
"""
from io import StringIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db import get_db
from app.models.peptide import PeptideCandidate
from app.schemas.candidate_review import (
    CandidateEvidenceOut,
    EvidenceOut,
    EvidenceRule,
    ReviewPayload,
    BatchReviewPayload,
    BatchReviewOut,
    ReviewSummaryOut,
)
from app.config import DISCLAIMER

router = APIRouter(prefix="/candidate-review")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_evidence(p: PeptideCandidate) -> EvidenceOut:
    length_pass = p.length is not None and 15 <= p.length <= 35
    charge_pass = p.net_charge is not None and p.net_charge > 0
    hydro_pass = p.hydrophobic_fraction is not None and 0.40 <= p.hydrophobic_fraction <= 0.70
    valid_pass = p.valid_aa == 1

    return EvidenceOut(
        length_rule=EvidenceRule(passed=length_pass, value=p.length, target="15-35 aa"),
        charge_rule=EvidenceRule(passed=charge_pass, value=p.net_charge, target=">0"),
        hydrophobic_rule=EvidenceRule(passed=hydro_pass, value=p.hydrophobic_fraction, target="0.40-0.70"),
        valid_aa_rule=EvidenceRule(passed=valid_pass, value=valid_pass),
        source=p.source,
        amp_score=p.amp_score,
        mic_ecoli=p.mic_ecoli,
        mic_saureus=p.mic_saureus,
    )


def _recommendation(p: PeptideCandidate) -> tuple[str, list[str]]:
    score = 0
    reasons = []

    if p.valid_aa == 1:
        score += 1
        reasons.append("Valid amino acids")
    if p.length is not None and 15 <= p.length <= 35:
        score += 1
        reasons.append("Length 15-35 aa")
    if p.net_charge is not None and p.net_charge > 0:
        score += 1
        reasons.append("Positive net charge")
    if p.hydrophobic_fraction is not None and 0.40 <= p.hydrophobic_fraction <= 0.70:
        score += 1
        reasons.append("Hydrophobic fraction 0.40-0.70")
    if p.status in ("CANDIDATE", "FILTERED"):
        score += 1
        reasons.append("Status=CANDIDATE/FILTERED")

    if score >= 4:
        return "SHORTLIST_CANDIDATE", reasons
    elif score >= 2:
        return "REVIEW", reasons
    else:
        return "LOW_PRIORITY", reasons


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/candidates")
def review_candidates(
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    review_status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    selected_for_synthesis: Optional[bool] = Query(None),
    min_length: Optional[int] = Query(None),
    max_length: Optional[int] = Query(None),
    min_charge: Optional[float] = Query(None),
    max_charge: Optional[float] = Query(None),
    min_hydrophobic_fraction: Optional[float] = Query(None),
    max_hydrophobic_fraction: Optional[float] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Return candidates with optional review filters."""
    q = db.query(PeptideCandidate)

    if status:
        q = q.filter(PeptideCandidate.status == status)
    if source:
        q = q.filter(PeptideCandidate.source == source)
    if review_status:
        q = q.filter(PeptideCandidate.review_status == review_status)
    if priority:
        q = q.filter(PeptideCandidate.priority == priority)
    if selected_for_synthesis is not None:
        q = q.filter(PeptideCandidate.selected_for_synthesis == selected_for_synthesis)
    if min_length is not None:
        q = q.filter(PeptideCandidate.length >= min_length)
    if max_length is not None:
        q = q.filter(PeptideCandidate.length <= max_length)
    if min_charge is not None:
        q = q.filter(PeptideCandidate.net_charge >= min_charge)
    if max_charge is not None:
        q = q.filter(PeptideCandidate.net_charge <= max_charge)
    if min_hydrophobic_fraction is not None:
        q = q.filter(PeptideCandidate.hydrophobic_fraction >= min_hydrophobic_fraction)
    if max_hydrophobic_fraction is not None:
        q = q.filter(PeptideCandidate.hydrophobic_fraction <= max_hydrophobic_fraction)

    results = q.order_by(PeptideCandidate.id.desc()).limit(limit).all()
    return results


@router.get("/candidates/{peptide_id}/evidence", response_model=CandidateEvidenceOut)
def candidate_evidence(peptide_id: int, db: Session = Depends(get_db)):
    """Return evidence card for a single candidate."""
    p = db.query(PeptideCandidate).filter(PeptideCandidate.id == peptide_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Peptide not found")

    evidence = _build_evidence(p)
    recommendation, reasons = _recommendation(p)

    return CandidateEvidenceOut(
        peptide_id=peptide_id,
        sequence=p.sequence,
        evidence=evidence,
        rule_based_recommendation=recommendation,
        reasons=reasons,
        disclaimer="Rule-based review only. Not experimentally validated.",
    )


@router.post("/candidates/{peptide_id}/review")
def review_single_candidate(peptide_id: int, payload: ReviewPayload, db: Session = Depends(get_db)):
    """Update review fields for a single candidate."""
    p = db.query(PeptideCandidate).filter(PeptideCandidate.id == peptide_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Peptide not found")

    update_data = payload.model_dump(exclude_unset=True)
    if update_data:
        for field, value in update_data.items():
            setattr(p, field, value)
        if any(k in update_data for k in ("review_status", "priority", "selected_for_synthesis", "batch_label", "review_notes")):
            p.reviewed_at = func.now()
        db.commit()
        db.refresh(p)

    return p


@router.post("/batch-review", response_model=BatchReviewOut)
def batch_review_candidates(payload: BatchReviewPayload, db: Session = Depends(get_db)):
    """Batch update review fields for multiple candidates."""
    if not payload.peptide_ids:
        raise HTTPException(status_code=400, detail="peptide_ids cannot be empty")

    update_data = payload.model_dump(exclude_unset=True)
    update_data.pop("peptide_ids", None)

    updated = 0
    skipped = []
    for pid in payload.peptide_ids:
        p = db.query(PeptideCandidate).filter(PeptideCandidate.id == pid).first()
        if not p:
            skipped.append(pid)
            continue
        for field, value in update_data.items():
            setattr(p, field, value)
        p.reviewed_at = func.now()
        updated += 1

    db.commit()
    return BatchReviewOut(
        updated_count=updated,
        skipped_ids=skipped,
        disclaimer="Rule-based review only. Not experimentally validated.",
    )


@router.get("/shortlist")
def get_shortlist(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Return shortlisted or selected-for-synthesis candidates."""
    q = db.query(PeptideCandidate).filter(
        (PeptideCandidate.review_status == "SHORTLISTED") | (PeptideCandidate.selected_for_synthesis == True)
    )
    return q.order_by(PeptideCandidate.id.desc()).limit(limit).all()


@router.get("/summary", response_model=ReviewSummaryOut)
def review_summary(db: Session = Depends(get_db)):
    """Return review summary statistics."""
    total = db.query(PeptideCandidate).count()
    unreviewed = db.query(PeptideCandidate).filter(PeptideCandidate.review_status.is_(None)).count()
    shortlisted = db.query(PeptideCandidate).filter(PeptideCandidate.review_status == "SHORTLISTED").count()
    rejected = db.query(PeptideCandidate).filter(PeptideCandidate.review_status == "REJECTED_BY_REVIEW").count()
    selected = db.query(PeptideCandidate).filter(PeptideCandidate.selected_for_synthesis == True).count()
    high = db.query(PeptideCandidate).filter(PeptideCandidate.priority == "HIGH").count()
    real_shortlisted = db.query(PeptideCandidate).filter(
        PeptideCandidate.source == "local_real_smoke",
        PeptideCandidate.review_status == "SHORTLISTED",
    ).count()
    demo_shortlisted = db.query(PeptideCandidate).filter(
        PeptideCandidate.source == "local_demo",
        PeptideCandidate.review_status == "SHORTLISTED",
    ).count()

    return ReviewSummaryOut(
        total_candidates=total,
        unreviewed_count=unreviewed,
        shortlisted_count=shortlisted,
        rejected_by_review_count=rejected,
        selected_for_synthesis_count=selected,
        high_priority_count=high,
        local_real_smoke_shortlisted=real_shortlisted,
        local_demo_shortlisted=demo_shortlisted,
        disclaimer="Shortlist is rule-based and requires wet-lab validation.",
    )


# ---------------------------------------------------------------------------
# Exports
# ---------------------------------------------------------------------------

CSV_HEADERS = [
    "id", "sequence", "length", "net_charge", "hydrophobic_fraction", "valid_aa",
    "status", "source", "generation_run_id", "priority", "review_status",
    "selected_for_synthesis", "batch_label", "review_notes",
    "amp_score", "mic_ecoli", "mic_saureus", "notes", "created_at", "reviewed_at",
]


def _get_shortlist_query(db: Session):
    return db.query(PeptideCandidate).filter(
        (PeptideCandidate.review_status == "SHORTLISTED") | (PeptideCandidate.selected_for_synthesis == True)
    )


def _format_value(v):
    """Format value for CSV export. Null stays empty, bool as true/false."""
    if v is None:
        return ""
    if isinstance(v, bool):
        return "true" if v else "false"
    return str(v)


@router.post("/export-shortlist.csv")
def export_shortlist_csv(db: Session = Depends(get_db)):
    """Export shortlisted candidates as CSV."""
    peptides = _get_shortlist_query(db).all()

    output = StringIO()
    output.write("\ufeff")  # UTF-8 BOM for Excel
    output.write(",".join(CSV_HEADERS) + "\n")

    for p in peptides:
        row = [_format_value(getattr(p, h, "")) for h in CSV_HEADERS]
        output.write(",".join(row) + "\n")

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=shortlist.csv"},
    )


@router.post("/export-shortlist.fasta")
def export_shortlist_fasta(db: Session = Depends(get_db)):
    """Export shortlisted candidates as FASTA."""
    peptides = _get_shortlist_query(db).all()

    lines = []
    for p in peptides:
        header = (
            f">peptide_{p.id}|priority={p.priority or 'none'}|"
            f"review_status={p.review_status or 'none'}|source={p.source or 'none'}|"
            f"length={p.length}|charge={p.net_charge or 'none'}"
        )
        lines.append(header)
        lines.append(p.sequence)

    content = "\n".join(lines) + "\n"
    return StreamingResponse(
        iter([content]),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=shortlist.fasta"},
    )


SYNTHESIS_HEADERS = [
    "Order_ID", "Peptide_Name", "Sequence", "Purity", "Scale",
    "Modification_N_terminal", "Modification_C_terminal", "Salt_Form",
    "Remarks", "Internal_ID", "Priority", "Review_Status", "Batch_Label", "Review_Notes",
]

DEFAULT_SYNTHESIS = {
    "Purity": "95%",
    "Scale": "5mg",
    "Modification_N_terminal": "None",
    "Modification_C_terminal": "None",
    "Salt_Form": "TFA/HCl to be confirmed",
    "Remarks": "Computational candidate; not experimentally validated.",
}


@router.post("/export-synthesis-order.csv")
def export_synthesis_order_csv(db: Session = Depends(get_db)):
    """Export synthesis order template CSV."""
    peptides = _get_shortlist_query(db).all()

    output = StringIO()
    output.write("\ufeff")
    output.write(",".join(SYNTHESIS_HEADERS) + "\n")

    for idx, p in enumerate(peptides, start=1):
        row = {
            "Order_ID": str(idx),
            "Peptide_Name": f"AMP_{p.id}",
            "Sequence": p.sequence,
            "Purity": DEFAULT_SYNTHESIS["Purity"],
            "Scale": DEFAULT_SYNTHESIS["Scale"],
            "Modification_N_terminal": DEFAULT_SYNTHESIS["Modification_N_terminal"],
            "Modification_C_terminal": DEFAULT_SYNTHESIS["Modification_C_terminal"],
            "Salt_Form": DEFAULT_SYNTHESIS["Salt_Form"],
            "Remarks": DEFAULT_SYNTHESIS["Remarks"],
            "Internal_ID": str(p.id),
            "Priority": p.priority or "",
            "Review_Status": p.review_status or "",
            "Batch_Label": p.batch_label or "",
            "Review_Notes": (p.review_notes or "").replace("\n", " ").replace("\r", " ").replace(",", ";"),
        }
        output.write(",".join([row[h] for h in SYNTHESIS_HEADERS]) + "\n")

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=synthesis_order.csv"},
    )
