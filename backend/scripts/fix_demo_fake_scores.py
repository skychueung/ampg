"""One-time fix: clear fake amp_score / MIC values from LOCAL_DEMO peptides.

Before v0.5.1-hotfix, local_demo_runner.py wrote heuristic/random amp_score,
mic_ecoli, mic_saureus, toxicity_risk, and hemolysis_risk. This script clears
them for all source='local_demo' records while preserving LOCAL_REAL_SMOKE.

Usage:
    cd backend
    python scripts/fix_demo_fake_scores.py
"""
import os
import sys
import shutil
from datetime import datetime

# Ensure app imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DATABASE_URL", "sqlite:///./data/ampgen_platform.db")

from app.db import engine
from sqlalchemy import text


def main():
    db_path = os.path.join(os.path.dirname(__file__), "..", "data", "ampgen_platform.db")
    db_path = os.path.abspath(db_path)
    if not os.path.exists(db_path):
        print(f"Database not found at: {db_path}")
        sys.exit(1)

    # Backup
    backup_dir = os.path.join(os.path.dirname(db_path), "..", "backups", "db")
    os.makedirs(backup_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"ampgen_platform_before_v051_hotfix_{ts}.db"
    backup_path = os.path.join(backup_dir, backup_name)
    shutil.copy2(db_path, backup_path)
    print(f"Database backed up to: {backup_path}")

    with engine.connect() as conn:
        # Stats before
        total_local_demo = conn.execute(
            text("SELECT COUNT(*) FROM peptide_candidates WHERE source='local_demo'")
        ).scalar()
        demo_amp_notnull = conn.execute(
            text("SELECT COUNT(*) FROM peptide_candidates WHERE source='local_demo' AND amp_score IS NOT NULL")
        ).scalar()
        demo_mic_notnull = conn.execute(
            text("SELECT COUNT(*) FROM peptide_candidates WHERE source='local_demo' AND (mic_ecoli IS NOT NULL OR mic_saureus IS NOT NULL)")
        ).scalar()
        demo_tox_notnull = conn.execute(
            text("SELECT COUNT(*) FROM peptide_candidates WHERE source='local_demo' AND (toxicity_risk IS NOT NULL OR hemolysis_risk IS NOT NULL)")
        ).scalar()
        real_amp_notnull = conn.execute(
            text("SELECT COUNT(*) FROM peptide_candidates WHERE source='local_real_smoke' AND amp_score IS NOT NULL")
        ).scalar()

        print(f"\n=== Before fix ===")
        print(f"  LOCAL_DEMO total:              {total_local_demo}")
        print(f"  LOCAL_DEMO amp_score non-null: {demo_amp_notnull}")
        print(f"  LOCAL_DEMO mic non-null:       {demo_mic_notnull}")
        print(f"  LOCAL_DEMO tox/hem non-null:   {demo_tox_notnull}")
        print(f"  LOCAL_REAL_SMOKE amp_score non-null: {real_amp_notnull}")

        # Fix: only local_demo records
        result = conn.execute(text("""
            UPDATE peptide_candidates
            SET amp_score = NULL,
                mic_ecoli = NULL,
                mic_saureus = NULL,
                toxicity_risk = NULL,
                hemolysis_risk = NULL
            WHERE source = 'local_demo'
        """))
        conn.commit()
        print(f"\n  Rows updated: {result.rowcount}")

        # Stats after
        demo_amp_notnull_after = conn.execute(
            text("SELECT COUNT(*) FROM peptide_candidates WHERE source='local_demo' AND amp_score IS NOT NULL")
        ).scalar()
        demo_mic_notnull_after = conn.execute(
            text("SELECT COUNT(*) FROM peptide_candidates WHERE source='local_demo' AND (mic_ecoli IS NOT NULL OR mic_saureus IS NOT NULL)")
        ).scalar()
        demo_tox_notnull_after = conn.execute(
            text("SELECT COUNT(*) FROM peptide_candidates WHERE source='local_demo' AND (toxicity_risk IS NOT NULL OR hemolysis_risk IS NOT NULL)")
        ).scalar()
        real_amp_notnull_after = conn.execute(
            text("SELECT COUNT(*) FROM peptide_candidates WHERE source='local_real_smoke' AND amp_score IS NOT NULL")
        ).scalar()

        print(f"\n=== After fix ===")
        print(f"  LOCAL_DEMO amp_score non-null: {demo_amp_notnull_after}")
        print(f"  LOCAL_DEMO mic non-null:       {demo_mic_notnull_after}")
        print(f"  LOCAL_DEMO tox/hem non-null:   {demo_tox_notnull_after}")
        print(f"  LOCAL_REAL_SMOKE amp_score non-null: {real_amp_notnull_after}")

        if real_amp_notnull_after != real_amp_notnull:
            print("\n  WARNING: LOCAL_REAL_SMOKE records were affected! This should not happen.")
        else:
            print("\n  OK: LOCAL_REAL_SMOKE records untouched.")

    print(f"\nDone. Backup: {backup_path}")


if __name__ == "__main__":
    main()
