from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class EvidenceRule(BaseModel):
    passed: bool
    value: Optional[float] = None
    target: str = ""


class EvidenceOut(BaseModel):
    length_rule: EvidenceRule
    charge_rule: EvidenceRule
    hydrophobic_rule: EvidenceRule
    valid_aa_rule: EvidenceRule
    source: Optional[str] = None
    amp_score: Optional[float] = None
    mic_ecoli: Optional[float] = None
    mic_saureus: Optional[float] = None


class CandidateEvidenceOut(BaseModel):
    peptide_id: int
    sequence: str
    evidence: EvidenceOut
    rule_based_recommendation: str
    reasons: List[str] = []
    disclaimer: str = ""


class ReviewPayload(BaseModel):
    review_status: Optional[str] = None
    priority: Optional[str] = None
    selected_for_synthesis: Optional[bool] = None
    batch_label: Optional[str] = None
    review_notes: Optional[str] = None


class BatchReviewPayload(BaseModel):
    peptide_ids: List[int]
    review_status: Optional[str] = None
    priority: Optional[str] = None
    selected_for_synthesis: Optional[bool] = None
    batch_label: Optional[str] = None


class BatchReviewOut(BaseModel):
    updated_count: int
    skipped_ids: List[int] = []
    disclaimer: str = ""


class CandidateFilters(BaseModel):
    status: Optional[str] = None
    source: Optional[str] = None
    review_status: Optional[str] = None
    priority: Optional[str] = None
    selected_for_synthesis: Optional[bool] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_charge: Optional[float] = None
    max_charge: Optional[float] = None
    min_hydrophobic_fraction: Optional[float] = None
    max_hydrophobic_fraction: Optional[float] = None
    limit: int = 100


class ReviewSummaryOut(BaseModel):
    total_candidates: int
    unreviewed_count: int
    shortlisted_count: int
    rejected_by_review_count: int
    selected_for_synthesis_count: int
    high_priority_count: int
    local_real_smoke_shortlisted: int
    local_demo_shortlisted: int
    disclaimer: str = ""


class P6FShortlistItem(BaseModel):
    rank: int
    sequence: str
    length: int
    amp_score: Optional[float] = None
    amp_like: Optional[int] = None
    mic_saureus: Optional[float] = None
    mic_saureus_logmic: Optional[float] = None
    mic_ecoli: Optional[str] = None
    combined_rank_score: Optional[float] = None
    net_charge_approx: Optional[float] = None
    hydrophobic_fraction: Optional[float] = None
    run_id: Optional[str] = None
    batch_id: Optional[str] = None
    peptide_id: Optional[str] = None
    source_group: Optional[str] = None
    source: Optional[str] = None


class P6FShortlistResponse(BaseModel):
    type: str
    count: int
    items: List[P6FShortlistItem]
    source_label: str
    disclaimer: str = ""
    metadata: dict = {}
