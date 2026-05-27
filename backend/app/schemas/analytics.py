from typing import Optional, List
from pydantic import BaseModel


class PeptideSummaryOut(BaseModel):
    total_peptides: int = 0
    valid_aa_count: int = 0
    invalid_aa_count: int = 0
    candidate_count: int = 0
    filtered_count: int = 0
    rejected_count: int = 0
    local_demo_count: int = 0
    local_real_smoke_count: int = 0
    average_length: Optional[float] = None
    average_net_charge: Optional[float] = None
    average_hydrophobic_fraction: Optional[float] = None
    not_computed_amp_score_count: int = 0
    not_computed_mic_count: int = 0
    disclaimer: str = ""


class DistributionBin(BaseModel):
    bin: str
    count: int


class PropertyDistributionsOut(BaseModel):
    length_distribution: List[DistributionBin] = []
    charge_distribution: List[DistributionBin] = []
    hydrophobic_fraction_distribution: List[DistributionBin] = []
    disclaimer: str = ""


class AminoAcidCompositionItem(BaseModel):
    aa: str
    count: int
    frequency: float


class AminoAcidCompositionOut(BaseModel):
    total_residues: int = 0
    invalid_residues: int = 0
    composition: List[AminoAcidCompositionItem] = []
    disclaimer: str = ""


class StatusCount(BaseModel):
    status: str
    count: int


class SourceCount(BaseModel):
    source: str
    count: int


class BackendCount(BaseModel):
    backend: str
    count: int


class StatusSourceBreakdownOut(BaseModel):
    status_counts: List[StatusCount] = []
    source_counts: List[SourceCount] = []
    backend_counts: List[BackendCount] = []
    disclaimer: str = ""


class FilterRule(BaseModel):
    rule: str
    label: str
    passed: int
    failed: int
    pass_rate: float


class FilterRulePassRateOut(BaseModel):
    rules: List[FilterRule] = []
    disclaimer: str = ""


class TopCandidateOut(BaseModel):
    id: int
    sequence: str
    length: int
    net_charge: Optional[float] = None
    hydrophobic_fraction: Optional[float] = None
    valid_aa: Optional[int] = None
    status: str
    source: Optional[str] = None
    generation_run_id: Optional[int] = None
    rule_based_rank: int
    rule_based_reason: str
    amp_score: Optional[float] = None
    mic_ecoli: Optional[float] = None
    mic_saureus: Optional[float] = None


class TopCandidatesOut(BaseModel):
    candidates: List[TopCandidateOut] = []
    total: int = 0
    disclaimer: str = ""


# ---------------------------------------------------------------------------
# v0.5.6 Run Comparison schemas
# ---------------------------------------------------------------------------


class GenerationRunSummaryItem(BaseModel):
    id: int
    task_id: Optional[int] = None
    mode: Optional[str] = None
    backend: Optional[str] = None
    status: str
    count: int
    created_at: str
    completed_at: Optional[str] = None


class GenerationRunsSummaryOut(BaseModel):
    runs: List[GenerationRunSummaryItem] = []
    total: int = 0
    disclaimer: str = ""


class GenerationRunAnalyticsOut(BaseModel):
    run_id: int
    total_peptides: int
    avg_length: Optional[float] = None
    avg_net_charge: Optional[float] = None
    avg_hydrophobic_fraction: Optional[float] = None
    status_counts: List[StatusCount] = []
    amino_acid_composition: List[AminoAcidCompositionItem] = []
    filter_rule_pass_rate: List[FilterRule] = []
    disclaimer: str = ""


class RunCompareItem(BaseModel):
    run_id: int
    run_info: GenerationRunSummaryItem
    total_peptides: int
    avg_length: Optional[float] = None
    avg_net_charge: Optional[float] = None
    avg_hydrophobic_fraction: Optional[float] = None
    candidate_count: int
    filtered_count: int
    rejected_count: int
    length_distribution: List[DistributionBin] = []
    status_counts: List[StatusCount] = []


class GenerationRunsCompareOut(BaseModel):
    compared_runs: List[RunCompareItem] = []
    disclaimer: str = ""


class GenerationRunsCompareRequest(BaseModel):
    run_ids: List[int]
