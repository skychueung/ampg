from typing import Optional, List
from pydantic import BaseModel


class SequenceOverviewOut(BaseModel):
    total_sequences: int = 0
    unique_sequences: int = 0
    duplicate_sequence_count: int = 0
    near_duplicate_pairs: int = 0
    average_length: Optional[float] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    local_demo_count: int = 0
    local_real_smoke_count: int = 0
    disclaimer: str = ""


class DuplicateGroup(BaseModel):
    sequence: str
    count: int
    peptide_ids: List[int]
    sources: List[str]
    statuses: List[str]


class DuplicatesOut(BaseModel):
    duplicate_groups: List[DuplicateGroup] = []
    total_duplicate_sequences: int = 0
    disclaimer: str = ""


class SimilarityPair(BaseModel):
    peptide_id_1: int
    sequence_1: str
    peptide_id_2: int
    sequence_2: str
    similarity: float
    length_1: int
    length_2: int
    source_1: Optional[str] = None
    source_2: Optional[str] = None


class SimilarityOut(BaseModel):
    threshold: float
    pairs: List[SimilarityPair] = []
    pair_count: int = 0
    disclaimer: str = ""


class AAFrequency(BaseModel):
    aa: str
    count: int
    frequency: float


class PositionFrequency(BaseModel):
    position: int
    frequencies: List[AAFrequency]


class DipeptideItem(BaseModel):
    motif: str
    count: int
    frequency: float


class MotifEnrichmentOut(BaseModel):
    n_terminal_position_frequencies: List[PositionFrequency] = []
    c_terminal_position_frequencies: List[PositionFrequency] = []
    top_dipeptides: List[DipeptideItem] = []
    top_amino_acids: List[AAFrequency] = []
    disclaimer: str = ""


class RepresentativePeptide(BaseModel):
    peptide_id: int
    sequence: str
    length: int
    net_charge: Optional[float] = None
    hydrophobic_fraction: Optional[float] = None
    status: str
    source: Optional[str] = None
    representative_rank: int
    reason: str


class RepresentativesOut(BaseModel):
    representatives: List[RepresentativePeptide] = []
    disclaimer: str = ""
