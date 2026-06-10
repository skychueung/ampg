"""Dry-run audit for job-15 amp_score=null samples.
Does NOT write back to original artifacts."""
import sys
import json
import os
from collections import Counter
from datetime import datetime

sys.path.insert(0, "/home/xh/kxc/ampg可视化/服务器版/backend")
from app.runners.server_production_runner import _score_sequences_with_p6e, STANDARD_AA

JOB15 = "/home/xh/kxc/ampg可视化/服务器版/server-artifacts/jobs/job-15-20260609_093220"
AUDIT_DIR = f"{JOB15}/audit_psekraac_b_fix_dryrun_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
os.makedirs(AUDIT_DIR, exist_ok=True)

def main():
    # Step 1: Load null samples from candidates.jsonl
    null_samples = []
    with open(f"{JOB15}/candidates.jsonl", "r") as f:
        for line in f:
            obj = json.loads(line)
            if obj.get("amp_score") is None:
                null_samples.append(obj)
    
    total_null = len(null_samples)
    print(f"[DRY-RUN] Total amp_score=null samples: {total_null}")
    
    # Step 2: Check amino acid composition
    unsupported_distribution = Counter()
    supported_count = 0
    unsupported_count = 0
    
    for s in null_samples:
        seq = s.get("sequence", "")
        unsupported = sorted(set(seq.upper()) - STANDARD_AA)
        if unsupported:
            unsupported_count += 1
            unsupported_distribution.update(unsupported)
        else:
            supported_count += 1
    
    print(f"[DRY-RUN] Supported sequences (could recover): {supported_count}")
    print(f"[DRY-RUN] Unsupported sequences (still null): {unsupported_count}")
    print(f"[DRY-RUN] Unsupported AA distribution: {dict(unsupported_distribution)}")
    
    # Step 3: Re-score with new sequence-level isolation
    sequences = [s["sequence"] for s in null_samples]
    new_scores = _score_sequences_with_p6e(sequences)
    
    recovered = 0
    still_null = 0
    recovered_scores = []
    
    for i, (sample, score) in enumerate(zip(null_samples, new_scores)):
        seq = sample["sequence"]
        if score is not None:
            recovered += 1
            recovered_scores.append(score)
        else:
            still_null += 1
    
    print(f"[DRY-RUN] Recovered amp_score count: {recovered}")
    print(f"[DRY-RUN] Still null count: {still_null}")
    if recovered_scores:
        print(f"[DRY-RUN] Recovered scores range: {min(recovered_scores):.4f} - {max(recovered_scores):.4f}")
    
    # Step 4: Write audit summary (NOT to original files)
    summary = {
        "dry_run_total_null_samples": total_null,
        "dry_run_supported_sequences": supported_count,
        "dry_run_unsupported_sequences": unsupported_count,
        "dry_run_recovered_amp_score_count": recovered,
        "dry_run_still_null_count": still_null,
        "dry_run_unsupported_aa_distribution": dict(unsupported_distribution),
        "dry_run_error_type_distribution": {
            "unsupported_amino_acid": unsupported_count,
            "other": still_null - unsupported_count
        },
        "dry_run_output_path": AUDIT_DIR,
        "dry_run_timestamp": datetime.now().isoformat(),
        "note": "This is a dry-run audit. No changes were written to candidates.jsonl, candidates.csv, or DB."
    }
    
    summary_path = f"{AUDIT_DIR}/dryrun_summary.json"
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)
    
    # Write detailed audit log
    audit_log_path = f"{AUDIT_DIR}/dryrun_detail.jsonl"
    with open(audit_log_path, "w") as f:
        for sample, score in zip(null_samples, new_scores):
            seq = sample["sequence"]
            unsupported = sorted(set(seq.upper()) - STANDARD_AA)
            record = {
                "sequence": seq,
                "old_amp_score": None,
                "new_amp_score": score,
                "unsupported_aa": unsupported if unsupported else None,
                "chunk_index": sample.get("chunk_index"),
                "sequence_index": sample.get("sequence_index"),
            }
            f.write(json.dumps(record) + "\n")
    
    print(f"[DRY-RUN] Audit summary saved to: {summary_path}")
    print(f"[DRY-RUN] Audit detail saved to: {audit_log_path}")
    print("[DRY-RUN] COMPLETE — no original artifacts modified")

if __name__ == "__main__":
    main()
