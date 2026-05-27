"""Analytics router for peptide candidate visualizations.

All statistics are computed from real SQLite data. No demo data, no fake scores.
"""
from collections import Counter
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db import get_db
from app.models.peptide import PeptideCandidate
from app.models.generation_run import GenerationRun
from app.schemas.analytics import (
    PeptideSummaryOut,
    PropertyDistributionsOut,
    DistributionBin,
    AminoAcidCompositionOut,
    AminoAcidCompositionItem,
    StatusSourceBreakdownOut,
    StatusCount,
    SourceCount,
    BackendCount,
    FilterRulePassRateOut,
    FilterRule,
    TopCandidatesOut,
    TopCandidateOut,
)
from app.config import DISCLAIMER

router = APIRouter(prefix="/analytics")

STANDARD_AA = set("ACDEFGHIKLMNPQRSTVWY")


@router.get("/peptides-summary", response_model=PeptideSummaryOut)
def peptides_summary(db: Session = Depends(get_db)):
    total = db.query(PeptideCandidate).count()
    valid_aa_count = db.query(PeptideCandidate).filter(PeptideCandidate.valid_aa == 1).count()
    invalid_aa_count = db.query(PeptideCandidate).filter(PeptideCandidate.valid_aa == 0).count()
    candidate_count = db.query(PeptideCandidate).filter(PeptideCandidate.status == "CANDIDATE").count()
    filtered_count = db.query(PeptideCandidate).filter(PeptideCandidate.status == "FILTERED").count()
    rejected_count = db.query(PeptideCandidate).filter(PeptideCandidate.status == "REJECTED").count()
    local_demo_count = db.query(PeptideCandidate).filter(PeptideCandidate.source == "local_demo").count()
    local_real_smoke_count = db.query(PeptideCandidate).filter(PeptideCandidate.source == "local_real_smoke").count()

    avg_length = db.query(func.avg(PeptideCandidate.length)).scalar()
    avg_charge = db.query(func.avg(PeptideCandidate.net_charge)).scalar()
    avg_hydro = db.query(func.avg(PeptideCandidate.hydrophobic_fraction)).scalar()

    not_computed_amp = db.query(PeptideCandidate).filter(PeptideCandidate.amp_score.is_(None)).count()
    not_computed_mic = db.query(PeptideCandidate).filter(PeptideCandidate.mic_ecoli.is_(None)).count()

    return {
        "total_peptides": total,
        "valid_aa_count": valid_aa_count,
        "invalid_aa_count": invalid_aa_count,
        "candidate_count": candidate_count,
        "filtered_count": filtered_count,
        "rejected_count": rejected_count,
        "local_demo_count": local_demo_count,
        "local_real_smoke_count": local_real_smoke_count,
        "average_length": round(avg_length, 2) if avg_length is not None else None,
        "average_net_charge": round(avg_charge, 2) if avg_charge is not None else None,
        "average_hydrophobic_fraction": round(avg_hydro, 2) if avg_hydro is not None else None,
        "not_computed_amp_score_count": not_computed_amp,
        "not_computed_mic_count": not_computed_mic,
        "disclaimer": DISCLAIMER,
    }


@router.get("/property-distributions", response_model=PropertyDistributionsOut)
def property_distributions(db: Session = Depends(get_db)):
    peptides = db.query(PeptideCandidate).all()

    length_bins = {"10-14": 0, "15-19": 0, "20-24": 0, "25-29": 0, "30-35": 0, ">35": 0}
    charge_bins = {"<=0": 0, "1-2": 0, "3-4": 0, "5-6": 0, ">6": 0}
    hydro_bins = {"<0.40": 0, "0.40-0.50": 0, "0.50-0.60": 0, "0.60-0.70": 0, ">0.70": 0}

    for p in peptides:
        # length
        l = p.length
        if l < 15:
            length_bins["10-14"] += 1
        elif l < 20:
            length_bins["15-19"] += 1
        elif l < 25:
            length_bins["20-24"] += 1
        elif l < 30:
            length_bins["25-29"] += 1
        elif l <= 35:
            length_bins["30-35"] += 1
        else:
            length_bins[">35"] += 1

        # charge
        c = p.net_charge if p.net_charge is not None else 0
        if c <= 0:
            charge_bins["<=0"] += 1
        elif c <= 2:
            charge_bins["1-2"] += 1
        elif c <= 4:
            charge_bins["3-4"] += 1
        elif c <= 6:
            charge_bins["5-6"] += 1
        else:
            charge_bins[">6"] += 1

        # hydrophobic fraction
        h = p.hydrophobic_fraction if p.hydrophobic_fraction is not None else 0
        if h < 0.40:
            hydro_bins["<0.40"] += 1
        elif h < 0.50:
            hydro_bins["0.40-0.50"] += 1
        elif h < 0.60:
            hydro_bins["0.50-0.60"] += 1
        elif h <= 0.70:
            hydro_bins["0.60-0.70"] += 1
        else:
            hydro_bins[">0.70"] += 1

    return {
        "length_distribution": [DistributionBin(bin=k, count=v) for k, v in length_bins.items()],
        "charge_distribution": [DistributionBin(bin=k, count=v) for k, v in charge_bins.items()],
        "hydrophobic_fraction_distribution": [DistributionBin(bin=k, count=v) for k, v in hydro_bins.items()],
        "disclaimer": DISCLAIMER,
    }


@router.get("/amino-acid-composition", response_model=AminoAcidCompositionOut)
def amino_acid_composition(db: Session = Depends(get_db)):
    peptides = db.query(PeptideCandidate).all()

    aa_counter = Counter()
    invalid_residues = 0
    total_residues = 0

    for p in peptides:
        seq = p.sequence.upper() if p.sequence else ""
        for aa in seq:
            total_residues += 1
            if aa in STANDARD_AA:
                aa_counter[aa] += 1
            else:
                invalid_residues += 1

    composition = []
    for aa in sorted(STANDARD_AA):
        count = aa_counter.get(aa, 0)
        frequency = round(count / total_residues, 4) if total_residues > 0 else 0.0
        composition.append(AminoAcidCompositionItem(aa=aa, count=count, frequency=frequency))

    return {
        "total_residues": total_residues,
        "invalid_residues": invalid_residues,
        "composition": composition,
        "disclaimer": DISCLAIMER,
    }


@router.get("/status-source-breakdown", response_model=StatusSourceBreakdownOut)
def status_source_breakdown(db: Session = Depends(get_db)):
    # Status counts
    status_results = (
        db.query(PeptideCandidate.status, func.count(PeptideCandidate.id))
        .group_by(PeptideCandidate.status)
        .all()
    )
    status_counts = [StatusCount(status=s, count=c) for s, c in status_results]

    # Ensure all expected statuses appear
    expected_statuses = {"GENERATED", "FILTERED", "CANDIDATE", "VALIDATED", "REJECTED"}
    existing = {s.status for s in status_counts}
    for es in expected_statuses - existing:
        status_counts.append(StatusCount(status=es, count=0))
    status_counts.sort(key=lambda x: ["GENERATED", "FILTERED", "CANDIDATE", "VALIDATED", "REJECTED"].index(x.status) if x.status in ["GENERATED", "FILTERED", "CANDIDATE", "VALIDATED", "REJECTED"] else 99)

    # Source counts
    source_results = (
        db.query(PeptideCandidate.source, func.count(PeptideCandidate.id))
        .group_by(PeptideCandidate.source)
        .all()
    )
    source_counts = [SourceCount(source=s or "unknown", count=c) for s, c in source_results]

    # Backend counts (map source to backend)
    backend_map = {
        "local_demo": "LOCAL_DEMO",
        "local_real_smoke": "LOCAL_REAL_SMOKE",
    }
    backend_counter = Counter()
    for s, c in source_results:
        backend = backend_map.get(s, "SERVER_PRODUCTION") if s else "UNKNOWN"
        backend_counter[backend] += c

    backend_counts = [
        BackendCount(backend=b, count=c)
        for b, c in sorted(backend_counter.items(), key=lambda x: ["LOCAL_DEMO", "LOCAL_REAL_SMOKE", "SERVER_PRODUCTION", "UNKNOWN"].index(x[0]) if x[0] in ["LOCAL_DEMO", "LOCAL_REAL_SMOKE", "SERVER_PRODUCTION", "UNKNOWN"] else 99)
    ]

    return {
        "status_counts": status_counts,
        "source_counts": source_counts,
        "backend_counts": backend_counts,
        "disclaimer": DISCLAIMER,
    }


@router.get("/filter-rule-pass-rate", response_model=FilterRulePassRateOut)
def filter_rule_pass_rate(db: Session = Depends(get_db)):
    total = db.query(PeptideCandidate).count()
    if total == 0:
        return {
            "rules": [
                FilterRule(rule="length_15_35", label="Length 15–35 aa", passed=0, failed=0, pass_rate=0.0),
                FilterRule(rule="valid_amino_acids", label="Valid amino acids", passed=0, failed=0, pass_rate=0.0),
                FilterRule(rule="net_charge_positive", label="Net charge > 0", passed=0, failed=0, pass_rate=0.0),
                FilterRule(rule="hydrophobic_fraction_0_40_0_70", label="Hydrophobic fraction 0.40–0.70", passed=0, failed=0, pass_rate=0.0),
            ],
            "disclaimer": DISCLAIMER,
        }

    # Rule 1: length 15-35
    length_pass = db.query(PeptideCandidate).filter(PeptideCandidate.length >= 15, PeptideCandidate.length <= 35).count()

    # Rule 2: valid amino acids
    valid_aa_pass = db.query(PeptideCandidate).filter(PeptideCandidate.valid_aa == 1).count()

    # Rule 3: net charge > 0
    charge_pass = db.query(PeptideCandidate).filter(PeptideCandidate.net_charge > 0).count()

    # Rule 4: hydrophobic fraction 0.40-0.70
    hydro_pass = db.query(PeptideCandidate).filter(
        PeptideCandidate.hydrophobic_fraction >= 0.40,
        PeptideCandidate.hydrophobic_fraction <= 0.70,
    ).count()

    rules = [
        FilterRule(rule="length_15_35", label="Length 15–35 aa", passed=length_pass, failed=total - length_pass, pass_rate=round(length_pass / total, 4)),
        FilterRule(rule="valid_amino_acids", label="Valid amino acids", passed=valid_aa_pass, failed=total - valid_aa_pass, pass_rate=round(valid_aa_pass / total, 4)),
        FilterRule(rule="net_charge_positive", label="Net charge > 0", passed=charge_pass, failed=total - charge_pass, pass_rate=round(charge_pass / total, 4)),
        FilterRule(rule="hydrophobic_fraction_0_40_0_70", label="Hydrophobic fraction 0.40–0.70", passed=hydro_pass, failed=total - hydro_pass, pass_rate=round(hydro_pass / total, 4)),
    ]

    return {"rules": rules, "disclaimer": DISCLAIMER}


@router.get("/top-candidates", response_model=TopCandidatesOut)
def top_candidates(limit: int = 10, db: Session = Depends(get_db)):
    peptides = db.query(PeptideCandidate).all()

    scored = []
    for p in peptides:
        score = 0
        reasons = []

        if p.valid_aa == 1:
            score += 1
            reasons.append("Valid AA")
        if p.length is not None and 15 <= p.length <= 35:
            score += 1
            reasons.append("Length 15-35")
        if p.net_charge is not None and p.net_charge > 0:
            score += 1
            reasons.append("Net charge > 0")
        if p.hydrophobic_fraction is not None and 0.40 <= p.hydrophobic_fraction <= 0.70:
            score += 1
            reasons.append("Hydrophobic fraction 0.40-0.70")
        if p.status == "CANDIDATE":
            score += 1
            reasons.append("Status=CANDIDATE")

        # Tie-breaker: higher net charge and hydrophobic fraction are better
        tie_breaker = (p.net_charge or 0) + (p.hydrophobic_fraction or 0)

        scored.append({
            "peptide": p,
            "score": score,
            "tie_breaker": tie_breaker,
            "reasons": reasons,
        })

    # Sort by score desc, then tie_breaker desc
    scored.sort(key=lambda x: (-x["score"], -x["tie_breaker"]))

    top = scored[:limit]
    candidates = []
    for rank, item in enumerate(top, start=1):
        p = item["peptide"]
        candidates.append(TopCandidateOut(
            id=p.id,
            sequence=p.sequence,
            length=p.length,
            net_charge=p.net_charge,
            hydrophobic_fraction=p.hydrophobic_fraction,
            valid_aa=p.valid_aa,
            status=p.status,
            source=p.source,
            generation_run_id=p.generation_run_id,
            rule_based_rank=rank,
            rule_based_reason="; ".join(item["reasons"]) if item["reasons"] else "No rules passed",
            amp_score=p.amp_score,
            mic_ecoli=p.mic_ecoli,
            mic_saureus=p.mic_saureus,
        ))

    return {
        "candidates": candidates,
        "total": len(peptides),
        "disclaimer": DISCLAIMER,
    }
