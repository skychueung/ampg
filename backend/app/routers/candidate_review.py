"""Candidate Review Workbench router for peptide shortlisting and synthesis planning.

All data from real SQLite. No demo data, no fake scores.
"""
import csv
import glob
from datetime import datetime
from io import StringIO
from pathlib import Path
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
    P6FShortlistItem,
    P6FShortlistResponse,
)
from app.config import DISCLAIMER, AMPGEN_VISUALIZATION_ROOT

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


# ---------------------------------------------------------------------------
# P6F Combined Shortlist (read-only CSV)
# ---------------------------------------------------------------------------

P6F_SHORTLIST_TYPE_MAP = {
    "low_mic_top100": "p6f_low_mic_top100_*.csv",
    "low_mic_top50": "p6f_low_mic_top50_*.csv",
    "low_mic_top20": "p6f_low_mic_top20_*.csv",
    "high_amp_top100": "p6f_high_amp_top100_*.csv",
    "high_amp_top50": "p6f_high_amp_top50_*.csv",
    "high_amp_top20": "p6f_high_amp_top20_*.csv",
    "combined_top100": "p6f_combined_top100_*.csv",
    "combined_top50": "p6f_combined_top50_*.csv",
    "combined_top20": "p6f_combined_top20_*.csv",
    "representative50": "p6f_representative50_combined_*.csv",
}


def _find_latest_csv(pattern: str) -> Optional[Path]:
    base = Path(AMPGEN_VISUALIZATION_ROOT) / "reports" / "p6f" / "combined_shortlist_1000_1000"
    files = list(base.glob(pattern))
    if not files:
        return None
    # Sort by modification time descending
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0]


def _safe_float(val: Optional[str]) -> Optional[float]:
    if val is None or val.strip() == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _safe_int(val: Optional[str]) -> Optional[int]:
    if val is None or val.strip() == "":
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


@router.get("/p6f-shortlist", response_model=P6FShortlistResponse)
def get_p6f_shortlist(
    type: str = Query("combined_top100", description="Shortlist type"),
):
    """Return P6F combined shortlist from the latest generated CSV.

    This endpoint is read-only and does not run any generation or scoring.
    """
    if type not in P6F_SHORTLIST_TYPE_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid type. Allowed: {list(P6F_SHORTLIST_TYPE_MAP.keys())}")

    pattern = P6F_SHORTLIST_TYPE_MAP[type]
    csv_path = _find_latest_csv(pattern)

    if csv_path is None:
        return P6FShortlistResponse(
            type=type,
            count=0,
            items=[],
            source_label="",
            disclaimer="Shortlist file not found. Please generate the combined shortlist first.",
        )

    items: list[P6FShortlistItem] = []
    with csv_path.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            mic_val = row.get("mic_saureus_uM") or row.get("mic_saureus")
            mic_ecoli_val = row.get("mic_ecoli")
            items.append(
                P6FShortlistItem(
                    rank=idx,
                    sequence=row.get("sequence", "").strip().upper(),
                    length=_safe_int(row.get("length")) or 0,
                    amp_score=_safe_float(row.get("amp_score")),
                    amp_like=_safe_int(row.get("amp_like")),
                    mic_saureus=_safe_float(mic_val),
                    mic_saureus_logmic=_safe_float(row.get("mic_saureus_logmic_pred_audit")),
                    mic_ecoli=mic_ecoli_val if mic_ecoli_val else None,
                    combined_rank_score=_safe_float(row.get("combined_rank_score")),
                    net_charge_approx=_safe_float(row.get("net_charge_approx")),
                    hydrophobic_fraction=_safe_float(row.get("hydrophobic_fraction")),
                    run_id=row.get("run_id") or None,
                    batch_id=row.get("batch_id") or None,
                    peptide_id=row.get("peptide_id") or None,
                    source_group=row.get("source_group") or None,
                    source=row.get("source") or None,
                )
            )

    return P6FShortlistResponse(
        type=type,
        count=len(items),
        items=items,
        source_label=str(csv_path.name),
        disclaimer=(
            "This shortlist is based on computational predictions only. "
            "amp_score comes from an XGBoost AMP discriminator; mic_saureus comes from an XGBoost baseline MIC regressor. "
            "Neither constitutes experimental validation of antimicrobial activity, toxicity, or hemolysis. "
            "mic_ecoli remains null because no E. coli model is available. "
            "Wet-lab validation is required before any therapeutic claims can be made."
        ),
        metadata={
            "available_types": list(P6F_SHORTLIST_TYPE_MAP.keys()),
            "total_rows": len(items),
            "columns": [
                "rank", "sequence", "length", "amp_score", "amp_like",
                "mic_saureus", "mic_saureus_logmic", "mic_ecoli",
                "combined_rank_score", "net_charge_approx", "hydrophobic_fraction",
                "run_id", "batch_id", "peptide_id", "source_group", "source",
            ],
            "generated_at": datetime.fromtimestamp(csv_path.stat().st_mtime).isoformat(),
            "source_manifest": str(csv_path),
        },
    )
