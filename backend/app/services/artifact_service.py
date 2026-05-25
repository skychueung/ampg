"""Artifact export helpers (CSV / FASTA)."""
import csv
import io
from typing import List
from app.models.peptide import PeptideCandidate
from app.config import DISCLAIMER


def export_candidates_csv(peptides: List[PeptideCandidate]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Sequence", "Length", "Net_Charge", "Hydrophobic_Fraction",
        "Hydrophobicity", "AMP_Score", "MIC_Ecoli", "MIC_SAureus",
        "Toxicity_Risk", "Hemolysis_Risk", "Status", "Source", "Notes",
        f"Disclaimer: {DISCLAIMER}"
    ])
    for p in peptides:
        writer.writerow([
            p.id, p.sequence, p.length, p.net_charge, p.hydrophobic_fraction,
            p.hydrophobicity, p.amp_score, p.mic_ecoli, p.mic_saureus,
            p.toxicity_risk, p.hemolysis_risk, p.status, p.source, p.notes,
        ])
    return output.getvalue()


def export_candidates_fasta(peptides: List[PeptideCandidate]) -> str:
    lines = []
    for p in peptides:
        header = f">AMP_{p.id}|status={p.status}|length={p.length}|charge={p.net_charge}|disclaimer={DISCLAIMER}"
        lines.append(header)
        lines.append(p.sequence)
    return "\n".join(lines)
