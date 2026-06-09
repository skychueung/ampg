"""Artifact export helpers (CSV / FASTA / JSON / Markdown)."""
import csv
import io
from typing import List, Any
from app.models.peptide import PeptideCandidate
from app.config import DISCLAIMER


def _fmt(val):
    """Format value for CSV: return empty string for None instead of 'None'."""
    if val is None:
        return ""
    return val


def export_candidates_csv(peptides: List[PeptideCandidate]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "sequence", "length", "net_charge", "hydrophobic_fraction",
        "valid_aa", "status", "source", "generation_run_id",
        "amp_score", "mic_ecoli", "mic_saureus", "notes", "created_at",
    ])
    for p in peptides:
        writer.writerow([
            p.id, p.sequence, p.length, _fmt(p.net_charge), _fmt(p.hydrophobic_fraction),
            p.valid_aa, p.status, p.source, p.generation_run_id,
            _fmt(p.amp_score), _fmt(p.mic_ecoli), _fmt(p.mic_saureus), p.notes, p.created_at,
        ])
    return output.getvalue()


def export_candidates_fasta(peptides: List[PeptideCandidate]) -> str:
    lines = []
    for p in peptides:
        if not p.sequence:
            continue
        header = f">peptide_{p.id}|status={p.status}|source={p.source}|length={p.length}|charge={_fmt(p.net_charge)}"
        lines.append(header)
        lines.append(p.sequence)
    return "\n".join(lines)


def build_run_markdown_report(run: Any, task: Any, peptides: List[PeptideCandidate], artifact_dir: str, logs_available: bool) -> str:
    """Build a Markdown report for a single generation run."""
    lines = []
    lines.append("# AMPGen Generation Run Report")
    lines.append("")
    lines.append("## 1. Run Summary")
    lines.append(f"- **Run ID**: {run.id}")
    lines.append(f"- **Task ID**: {run.task_id}")
    lines.append(f"- **Backend**: {run.backend}")
    lines.append(f"- **Mode**: {run.mode}")
    lines.append(f"- **Count Requested**: {run.count}")
    lines.append(f"- **Status**: {run.status}")
    lines.append(f"- **Created At**: {run.created_at}")
    if run.completed_at:
        lines.append(f"- **Completed At**: {run.completed_at}")
    lines.append("")
    lines.append("## 2. Task Status")
    if task:
        lines.append(f"- **Status**: {task.status}")
        lines.append(f"- **Message**: {task.message or 'N/A'}")
        lines.append(f"- **Progress**: {task.progress}/{task.total}")
        lines.append(f"- **Artifact Directory**: {task.artifact_dir or 'N/A'}")
        if task.error_message:
            lines.append(f"- **Error**: {task.error_message}")
    else:
        lines.append("Task not found.")
    lines.append("")
    lines.append("## 3. Generated Peptides")
    if peptides:
        lines.append("| Sequence | Length | Net Charge | Hydrophobic Fraction | Status | Source | AMP Score | MIC E.coli | MIC S.aureus |")
        lines.append("|----------|--------|------------|----------------------|--------|--------|-----------|------------|--------------|")
        for p in peptides:
            amp = _fmt(p.amp_score) if p.amp_score is not None else "Not computed"
            mic_e = _fmt(p.mic_ecoli) if p.mic_ecoli is not None else "Not computed"
            mic_s = _fmt(p.mic_saureus) if p.mic_saureus is not None else "Not computed"
            lines.append(f"| {p.sequence} | {p.length} | {_fmt(p.net_charge)} | {_fmt(p.hydrophobic_fraction)} | {p.status} | {p.source} | {amp} | {mic_e} | {mic_s} |")
    else:
        lines.append("No peptides generated.")
    lines.append("")
    lines.append("## 4. Artifact Evidence")
    lines.append(f"- **Artifact Directory**: {artifact_dir or 'N/A'}")
    lines.append(f"- **Logs Available**: {'Yes' if logs_available else 'No'}")
    lines.append("")
    lines.append("## 5. Scientific Boundary")
    lines.append("> **Computational prediction only. Not experimentally validated.**")
    lines.append("> **LOCAL_REAL_SMOKE generates sequences only and does not validate antimicrobial activity.**")
    lines.append("> **amp_score and MIC values are not computed unless real discriminator/scorer models are executed.**")
    lines.append("")
    lines.append("## 6. Next Experimental Validation")
    lines.append("- Peptide synthesis")
    lines.append("- MIC assay")
    lines.append("- MBC assay")
    lines.append("- Hemolysis assay")
    lines.append("- Cytotoxicity assay")
    lines.append("")
    return "\n".join(lines)
