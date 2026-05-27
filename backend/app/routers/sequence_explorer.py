"""Sequence Explorer router for peptide sequence-level analysis.

All statistics are computed from real SQLite data. No demo data, no fake scores.
"""
from collections import Counter, defaultdict
from typing import List, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db import get_db
from app.models.peptide import PeptideCandidate
from app.schemas.sequence_explorer import (
    SequenceOverviewOut,
    DuplicateGroup,
    DuplicatesOut,
    SimilarityPair,
    SimilarityOut,
    AAFrequency,
    PositionFrequency,
    DipeptideItem,
    MotifEnrichmentOut,
    RepresentativePeptide,
    RepresentativesOut,
)
from app.config import DISCLAIMER

router = APIRouter(prefix="/sequence-explorer")

STANDARD_AA = set("ACDEFGHIKLMNPQRSTVWY")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _levenshtein_distance(s1: str, s2: str) -> int:
    """Compute Levenshtein distance using DP with space optimization."""
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    prev = list(range(len(s2) + 1))
    curr = [0] * (len(s2) + 1)

    for i, c1 in enumerate(s1):
        curr[0] = i + 1
        for j, c2 in enumerate(s2):
            insertions = prev[j + 1] + 1
            deletions = curr[j] + 1
            substitutions = prev[j] + (0 if c1 == c2 else 1)
            curr[j + 1] = min(insertions, deletions, substitutions)
        prev, curr = curr, prev

    return prev[len(s2)]


def _normalized_similarity(s1: str, s2: str) -> float:
    """Normalized Levenshtein similarity: 1 - distance / max_len."""
    max_len = max(len(s1), len(s2))
    if max_len == 0:
        return 1.0
    dist = _levenshtein_distance(s1, s2)
    return round(1.0 - dist / max_len, 4)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/overview", response_model=SequenceOverviewOut)
def sequence_overview(db: Session = Depends(get_db)):
    total = db.query(PeptideCandidate).count()
    if total == 0:
        return SequenceOverviewOut(disclaimer=DISCLAIMER)

    sequences = db.query(PeptideCandidate.sequence).all()
    seq_list = [s[0] for s in sequences if s[0]]
    unique = len(set(seq.upper() for seq in seq_list))

    # Duplicate count: sequences that appear more than once
    seq_counter = Counter(seq.upper() for seq in seq_list)
    duplicate_count = sum(1 for seq, cnt in seq_counter.items() if cnt > 1)

    avg_len = db.query(func.avg(PeptideCandidate.length)).scalar()
    min_len = db.query(func.min(PeptideCandidate.length)).scalar()
    max_len = db.query(func.max(PeptideCandidate.length)).scalar()

    local_demo = db.query(PeptideCandidate).filter(PeptideCandidate.source == "local_demo").count()
    local_real = db.query(PeptideCandidate).filter(PeptideCandidate.source == "local_real_smoke").count()

    return SequenceOverviewOut(
        total_sequences=total,
        unique_sequences=unique,
        duplicate_sequence_count=duplicate_count,
        near_duplicate_pairs=0,  # computed on demand by similarity endpoint
        average_length=round(avg_len, 2) if avg_len is not None else None,
        min_length=min_len,
        max_length=max_len,
        local_demo_count=local_demo,
        local_real_smoke_count=local_real,
        disclaimer=DISCLAIMER,
    )


@router.get("/duplicates", response_model=DuplicatesOut)
def duplicate_sequences(db: Session = Depends(get_db)):
    peptides = db.query(PeptideCandidate).all()
    if not peptides:
        return DuplicatesOut(disclaimer=DISCLAIMER)

    groups = defaultdict(list)
    for p in peptides:
        key = p.sequence.upper() if p.sequence else ""
        groups[key].append(p)

    duplicate_groups = []
    total_dup_seqs = 0
    for seq, items in groups.items():
        if len(items) > 1:
            duplicate_groups.append(DuplicateGroup(
                sequence=seq,
                count=len(items),
                peptide_ids=[p.id for p in items],
                sources=list({p.source or "unknown" for p in items}),
                statuses=list({p.status for p in items}),
            ))
            total_dup_seqs += len(items)

    return DuplicatesOut(
        duplicate_groups=duplicate_groups,
        total_duplicate_sequences=total_dup_seqs,
        disclaimer=DISCLAIMER,
    )


@router.get("/similarity", response_model=SimilarityOut)
def sequence_similarity(
    threshold: float = Query(0.8, ge=0.0, le=1.0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    peptides = db.query(PeptideCandidate).all()
    if len(peptides) < 2:
        return SimilarityOut(threshold=threshold, disclaimer=DISCLAIMER)

    pairs = []
    n = len(peptides)

    # O(n^2) with early bail-out for large datasets
    # Safety: skip if >2000 peptides to avoid timeout
    if n > 2000:
        raise HTTPException(status_code=400, detail="Too many peptides for pairwise similarity. Use filters to reduce dataset.")

    for i in range(n):
        p1 = peptides[i]
        s1 = p1.sequence.upper() if p1.sequence else ""
        if not s1:
            continue
        for j in range(i + 1, n):
            p2 = peptides[j]
            s2 = p2.sequence.upper() if p2.sequence else ""
            if not s2:
                continue

            # Quick length filter: skip if length differs by >30%
            max_len = max(len(s1), len(s2))
            min_len = min(len(s1), len(s2))
            if max_len > 0 and min_len / max_len < 0.7:
                continue

            sim = _normalized_similarity(s1, s2)
            if sim >= threshold:
                pairs.append(SimilarityPair(
                    peptide_id_1=p1.id,
                    sequence_1=p1.sequence,
                    peptide_id_2=p2.id,
                    sequence_2=p2.sequence,
                    similarity=sim,
                    length_1=p1.length,
                    length_2=p2.length,
                    source_1=p1.source,
                    source_2=p2.source,
                ))
                if len(pairs) >= limit:
                    break
        if len(pairs) >= limit:
            break

    return SimilarityOut(
        threshold=threshold,
        pairs=pairs,
        pair_count=len(pairs),
        disclaimer=DISCLAIMER,
    )


@router.get("/motif-enrichment", response_model=MotifEnrichmentOut)
def motif_enrichment(db: Session = Depends(get_db)):
    peptides = db.query(PeptideCandidate).all()
    if not peptides:
        return MotifEnrichmentOut(disclaimer=DISCLAIMER)

    # N-terminal and C-terminal position frequencies (first 5 and last 5)
    n_term_len = 5
    c_term_len = 5

    n_term_counters = [Counter() for _ in range(n_term_len)]
    c_term_counters = [Counter() for _ in range(c_term_len)]
    dipeptide_counter = Counter()
    aa_counter = Counter()
    total_dipeptides = 0
    total_residues = 0

    for p in peptides:
        seq = p.sequence.upper() if p.sequence else ""
        if not seq:
            continue

        # N-terminal
        for pos in range(min(n_term_len, len(seq))):
            aa = seq[pos]
            if aa in STANDARD_AA:
                n_term_counters[pos][aa] += 1

        # C-terminal
        for pos in range(min(c_term_len, len(seq))):
            aa = seq[-(pos + 1)]
            if aa in STANDARD_AA:
                c_term_counters[pos][aa] += 1

        # Dipeptides
        for i in range(len(seq) - 1):
            dp = seq[i:i + 2]
            if all(c in STANDARD_AA for c in dp):
                dipeptide_counter[dp] += 1
                total_dipeptides += 1

        # Amino acid counts
        for aa in seq:
            if aa in STANDARD_AA:
                aa_counter[aa] += 1
                total_residues += 1

    def _make_pos_freq(counters: List[Counter]) -> List[PositionFrequency]:
        result = []
        for pos, counter in enumerate(counters):
            total = sum(counter.values())
            freqs = [
                AAFrequency(aa=aa, count=cnt, frequency=round(cnt / total, 4) if total > 0 else 0.0)
                for aa, cnt in sorted(counter.items())
            ]
            result.append(PositionFrequency(position=pos + 1, frequencies=freqs))
        return result

    n_term_freqs = _make_pos_freq(n_term_counters)
    c_term_freqs = _make_pos_freq(c_term_counters)

    top_dipeptides = [
        DipeptideItem(motif=dp, count=cnt, frequency=round(cnt / total_dipeptides, 4) if total_dipeptides > 0 else 0.0)
        for dp, cnt in dipeptide_counter.most_common(20)
    ]

    top_aas = [
        AAFrequency(aa=aa, count=cnt, frequency=round(cnt / total_residues, 4) if total_residues > 0 else 0.0)
        for aa, cnt in aa_counter.most_common(10)
    ]

    return MotifEnrichmentOut(
        n_terminal_position_frequencies=n_term_freqs,
        c_terminal_position_frequencies=c_term_freqs,
        top_dipeptides=top_dipeptides,
        top_amino_acids=top_aas,
        disclaimer="Motif statistics are descriptive only and not functional validation.",
    )


@router.get("/representatives", response_model=RepresentativesOut)
def representative_peptides(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    peptides = db.query(PeptideCandidate).all()
    if not peptides:
        return RepresentativesOut(disclaimer=DISCLAIMER)

    # Score each peptide for representative quality
    scored = []
    for p in peptides:
        score = 0
        reasons = []

        if p.valid_aa == 1:
            score += 2
            reasons.append("Valid AA")
        if p.length is not None and 15 <= p.length <= 35:
            score += 2
            reasons.append("Length 15-35")
        if p.net_charge is not None and p.net_charge > 0:
            score += 2
            reasons.append("Net charge > 0")
        if p.hydrophobic_fraction is not None and 0.40 <= p.hydrophobic_fraction <= 0.70:
            score += 2
            reasons.append("Hydrophobic fraction 0.40-0.70")
        if p.status in ("CANDIDATE", "FILTERED"):
            score += 1
            reasons.append(f"Status={p.status}")

        tie_breaker = (p.net_charge or 0) + (p.hydrophobic_fraction or 0)

        scored.append({
            "peptide": p,
            "score": score,
            "tie_breaker": tie_breaker,
            "reasons": reasons,
        })

    # Sort by score desc, then tie_breaker desc
    scored.sort(key=lambda x: (-x["score"], -x["tie_breaker"]))

    # Greedy selection: skip sequences too similar to already selected representatives
    selected = []
    selected_seqs = []
    min_sim_to_skip = 0.85  # skip if similarity >= 0.85 to an existing representative

    for item in scored:
        p = item["peptide"]
        seq = p.sequence.upper() if p.sequence else ""
        if not seq:
            continue

        too_similar = False
        for sel_seq in selected_seqs:
            if _normalized_similarity(seq, sel_seq) >= min_sim_to_skip:
                too_similar = True
                break

        if too_similar:
            continue

        selected.append(item)
        selected_seqs.append(seq)

        if len(selected) >= limit:
            break

    representatives = []
    for rank, item in enumerate(selected, start=1):
        p = item["peptide"]
        reasons = item["reasons"]
        if len(reasons) > 1:
            reason_str = ", ".join(reasons) + ", low similarity to previous representatives."
        elif reasons:
            reason_str = reasons[0] + ", low similarity to previous representatives."
        else:
            reason_str = "Low similarity to previous representatives."

        representatives.append(RepresentativePeptide(
            peptide_id=p.id,
            sequence=p.sequence,
            length=p.length,
            net_charge=p.net_charge,
            hydrophobic_fraction=p.hydrophobic_fraction,
            status=p.status,
            source=p.source,
            representative_rank=rank,
            reason=reason_str,
        ))

    return RepresentativesOut(
        representatives=representatives,
        disclaimer="Rule-based representative selection only. Not a model prediction.",
    )
