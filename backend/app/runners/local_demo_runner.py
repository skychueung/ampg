"""Local demo runner: generates lightweight peptide candidates in-process.

All results are explicitly marked as Demo / computational preview.
No real XGBoost, LSTM, or MIC model outputs are fabricated.
"""
import random
from datetime import datetime
from sqlalchemy.orm import Session

from app.config import LOCAL_DEMO_MAX_COUNT, DISCLAIMER
from app.models.task import Task
from app.models.generation_run import GenerationRun
from app.models.peptide import PeptideCandidate
from app.services.physicochemical import (
    apply_amp_filter,
    check_invalid_aa,
)

AMP_AA_POOL = list("AAAKKLLFFIIWWGGNNRRHHCCSSQQDDEEYYVVMMPPTT")


def _generate_sequence(length: int) -> str:
    return "".join(random.choice(AMP_AA_POOL) for _ in range(length))


def run_local_demo_generation(db: Session, run: GenerationRun) -> dict:
    if run.count > LOCAL_DEMO_MAX_COUNT:
        return {
            "status": "BLOCKED",
            "message": (
                f"LOCAL_DEMO backend is limited to {LOCAL_DEMO_MAX_COUNT} peptides. "
                f"Requested {run.count}. Use LOCAL_REAL_SMOKE (max {LOCAL_DEMO_MAX_COUNT}) for larger batches."
            ),
        }

    task = db.query(Task).filter(Task.id == run.task_id).first() if run.task_id else None
    if task:
        task.status = "RUNNING"
        db.commit()

    generated_count = 0
    for i in range(run.count):
        # Check cancellation request
        if task:
            db.refresh(task)
            if task.cancel_requested:
                run.status = "CANCELLED"
                run.completed_at = datetime.utcnow()
                task.status = "CANCELLED"
                task.cancelled_at = datetime.utcnow()
                task.completed_at = datetime.utcnow()
                task.message = "Task cancelled by user."
                db.commit()
                return {
                    "status": "CANCELLED",
                    "message": "Task cancelled by user.",
                }

        length = random.randint(run.min_length or 15, run.max_length or 35)
        seq = _generate_sequence(length)
        filter_result = apply_amp_filter(seq)

        if filter_result["passed"]:
            status = "CANDIDATE"
        elif check_invalid_aa(seq):
            status = "REJECTED"
        else:
            status = "FILTERED"

        # AMP score and MIC are not computed for LOCAL_DEMO.
        # Only physicochemical properties (length, charge, hydrophobicity, valid_aa) are calculated.
        amp_score = None
        mic_ecoli = None
        mic_saureus = None
        toxicity_risk = None
        hemolysis_risk = None

        peptide = PeptideCandidate(
            sequence=seq,
            length=filter_result["length"],
            net_charge=filter_result["net_charge"],
            hydrophobic_fraction=filter_result["hydrophobic_fraction"],
            hydrophobicity=filter_result["hydrophobicity"],
            valid_aa=filter_result["valid_aa"],
            amp_score=amp_score,
            mic_ecoli=mic_ecoli,
            mic_saureus=mic_saureus,
            toxicity_risk=toxicity_risk,
            hemolysis_risk=hemolysis_risk,
            status=status,
            source="local_demo",
            generation_run_id=run.id,
            notes=f"Local demo sequence only. AMP score and MIC are not computed. {DISCLAIMER}",
        )
        db.add(peptide)
        generated_count += 1

    db.commit()

    run.status = "SUCCEEDED"
    run.completed_at = datetime.utcnow()
    db.commit()

    if task:
        task.status = "SUCCEEDED"
        task.progress = generated_count
        task.total = run.count
        task.completed_at = datetime.utcnow()
        task.message = f"Generated {generated_count} peptides via LOCAL_DEMO."
        db.commit()

    return {
        "status": "SUCCEEDED",
        "message": f"Generated {generated_count} peptides (demo).",
    }
