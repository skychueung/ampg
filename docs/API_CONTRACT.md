# AMPGen Agent Platform — API Contract

## Base URL

```
http://127.0.0.1:8001
```

All endpoints are prefixed with `/api` or `/api/v1`.

---

## Health & System

### GET /api/health

**Response:**
```json
{
  "status": "ok",
  "backend": "ok",
  "database": "ok",
  "artifact_dir": "ok",
  "artifact_dir_path": "..."
}
```

### GET /api/v1/system/ampgen-probe

**Response:**
```json
{
  "available": true,
  "root": "D:\\Desktop\\ampg\\AMPGen",
  "scripts": ["generate_unconditional.py", "generate_conditional.py"],
  "disclaimer": "Computational prediction only..."
}
```

---

## Generation Runs

### POST /api/v1/generation-runs

**Body:**
```json
{
  "backend": "LOCAL_DEMO",
  "mode": "Sequence-based",
  "count": 2,
  "min_length": 15,
  "max_length": 35,
  "temperature": 1.0,
  "top_p": 0.95
}
```

**Response (200):**
```json
{
  "id": 1,
  "task_id": 1,
  "mode": "Sequence-based",
  "backend": "LOCAL_DEMO",
  "count": 2,
  "status": "PENDING",
  "created_at": "2026-05-25T10:00:00"
}
```

**Response (200 BLOCKED):**
```json
{
  "id": 1,
  "task_id": 1,
  "status": "BLOCKED",
  "message": "Count exceeds LOCAL_REAL_SMOKE max limit of 2"
}
```

**Rules:**
- `LOCAL_DEMO`: count ≤ 5
- `LOCAL_REAL_SMOKE`: count ≤ 2
- `SERVER_PRODUCTION`: always BLOCKED

### GET /api/v1/generation-runs/{run_id}

**Response:**
```json
{
  "id": 1,
  "task_id": 1,
  "status": "SUCCEEDED",
  "created_at": "2026-05-25T10:00:00",
  "completed_at": "2026-05-25T10:00:45"
}
```

### GET /api/v1/generation-runs/{run_id}/peptides

**Response:**
```json
{
  "id": 1,
  "task_id": 1,
  "status": "SUCCEEDED",
  "peptides": [
    {
      "id": 1,
      "sequence": "MKRLKVKDKCQKEFNIKSVIRQ",
      "length": 23,
      "net_charge": 6.0,
      "hydrophobic_fraction": 0.391,
      "amp_score": null,
      "mic_ecoli": null,
      "mic_saureus": null,
      "status": "FILTERED",
      "source": "local_real_smoke"
    }
  ],
  "disclaimer": "Computational prediction only. Not experimentally validated."
}
```

---

## Tasks

### GET /api/v1/tasks

**Query params (optional):** `?status=RUNNING`

**Response:**
```json
[
  {
    "id": 1,
    "type": "AMP Generation",
    "status": "SUCCEEDED",
    "progress": 2,
    "total": 2,
    "message": "Generated 2 peptides via LOCAL_DEMO...",
    "created_at": "2026-05-25T10:00:00",
    "completed_at": "2026-05-25T10:00:03"
  }
]
```

### GET /api/v1/tasks/{task_id}

**Response:** Same as single item above.

### GET /api/v1/generation-runs

**Response:**
```json
[
  {
    "id": 1,
    "task_id": 1,
    "mode": "Sequence-based",
    "backend": "LOCAL_DEMO",
    "count": 2,
    "status": "SUCCEEDED",
    "created_at": "2026-05-25T10:00:00",
    "completed_at": "2026-05-25T10:00:03"
  }
]
```

### POST /api/v1/tasks/{task_id}/cancel

**Behavior:**
- Does NOT delete the task record.
- Sets `cancel_requested = true` and `cancel_requested_at`.
- If `process_pid` is known, sends SIGTERM to the subprocess.
- Safe for PENDING and RUNNING tasks.
- No-op for terminal states (SUCCEEDED, FAILED, BLOCKED, CANCELLED).

**Response (200 CANCEL_REQUESTED):**
```json
{
  "status": "CANCEL_REQUESTED",
  "task_id": 1,
  "message": "Cancellation requested. The task will stop at the next safe checkpoint.",
  "disclaimer": "Computational prediction only..."
}
```

**Response (200 terminal noop):**
```json
{
  "status": "SUCCEEDED",
  "task_id": 1,
  "message": "Task is already in terminal state: SUCCEEDED. No action taken.",
  "disclaimer": "Computational prediction only..."
}
```

### GET /api/v1/reports/candidates.csv

**Response:** `text/csv; charset=utf-8-sig` attachment.

Columns: `id, sequence, length, net_charge, hydrophobic_fraction, valid_aa, status, source, generation_run_id, amp_score, mic_ecoli, mic_saureus, notes, created_at`

### GET /api/v1/reports/candidates.fasta

**Response:** `text/plain` FASTA attachment.

Header format: `>peptide_{id}|status={status}|source={source}|length={length}|charge={net_charge}`

### GET /api/v1/reports/tasks.json

**Response:**
```json
{
  "tasks": [...],
  "total": 15,
  "disclaimer": "Computational prediction only..."
}
```

### GET /api/v1/reports/generation-runs/{run_id}.json

**Response:**
```json
{
  "generation_run": { ... },
  "task": { ... },
  "peptides": [ ... ],
  "scientific_boundary": {
    "computational_only": true,
    "disclaimer": "..."
  },
  "artifact_dir": "...",
  "logs_available": true
}
```

### GET /api/v1/reports/generation-runs/{run_id}.md

**Response:** `text/markdown` attachment with full structured report including Scientific Boundary and Next Experimental Validation sections.

### GET /api/v1/tasks/{task_id}/logs

**Response:**
```json
{
  "task_id": 1,
  "logs": [],
  "artifact_logs": {
    "stdout.log": ["Data saved to ..."],
    "stderr.log": ["0%|...", "100%|..."]
  },
  "disclaimer": "Computational prediction only..."
}
```

---

## Peptides

### GET /api/v1/peptides

**Query params (optional):** `?source=local_real_smoke&status=GENERATED`

**Response:**
```json
{
  "items": [...],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "disclaimer": "Computational prediction only..."
}
```

---

## Reports

### GET /api/v1/reports/candidates.csv

**Response:** `text/csv` download of all peptide candidates.

### GET /api/v1/reports/candidates.fasta

**Response:** `text/plain` FASTA format download.

---

## Common Rules

1. **All responses include `disclaimer`** field.
2. **All `amp_score`, `mic_*` fields may be `null`** for LOCAL_REAL_SMOKE.
3. **POST /generation-runs is non-blocking** — returns immediately with `PENDING`.
4. **Poll `GET /generation-runs/{id}` or `GET /generation-runs/{id}/peptides`** to track completion.


## Dashboard API (v0.5.2)

### GET /api/v1/dashboard/summary

Returns real database statistics.

### GET /api/v1/dashboard/recent-runs?limit=5

Returns recent generation runs with peptide counts.

## Peptide Detail API (confirmed v0.5.2)

### GET /api/v1/peptides/{peptide_id}

Returns full peptide details including null scores.



## Artifacts API (v0.5.4)

### GET /api/v1/generation-runs/{run_id}/artifacts

Returns artifact file status for a generation run.

**Response (200)**:
```json
{
  "artifact_dir": "data/artifacts/run_1_20260526_153454",
  "files": [
    {
      "name": "stdout.log",
      "exists": true,
      "size_kb": 12.34,
      "modified_at": "2026-05-26T15:34:56",
      "type": "log"
    }
  ],
  "message": "Found 1 artifact files."
}
```

**Response (200, empty)**:
```json
{
  "artifact_dir": null,
  "files": [],
  "message": "No artifacts directory configured for this run."
}
```

**Response (404)**: Run ID does not exist.

**Security**: Path traversal is blocked. Resolved artifact_dir must start with ARTIFACT_DIR.

**Design Note**: LOCAL_DEMO runs return empty `files` because generation is in-memory.
LOCAL_REAL_SMOKE runs return actual stdout.log, stderr.log, generated_sequences.csv, generated_sequences.fasta.

## Task API Enhancement (v0.5.4)

### GET /api/v1/tasks/{task_id}

Now includes `related_generation_run_id` for generation tasks:
```json
{
  "id": 1,
  "type": "AMP Generation",
  "status": "SUCCEEDED",
  ...,
  "related_generation_run_id": 1
}
```

## Workflow Page APIs (v0.5.4)

The AMPGen Workflow Visualizer page (`/ampgen-workflow`) calls:
- `GET /api/health`
- `GET /api/v1/system/ampgen-probe`
- `GET /api/v1/dashboard/summary`

## Run Detail Page APIs (v0.5.4)

The Generation Run Detail page (`/generation-runs/:runId`) calls:
- `GET /api/v1/generation-runs/{run_id}`
- `GET /api/v1/generation-runs/{run_id}/peptides`
- `GET /api/v1/generation-runs/{run_id}/artifacts`
- `GET /api/v1/tasks/{task_id}` (if task_id exists)
- `GET /api/v1/tasks/{task_id}/logs` (when logs panel expanded)

## Analytics API (v0.5.5)

### GET /api/v1/analytics/peptides-summary

Returns aggregated peptide statistics from real SQLite data.

### GET /api/v1/analytics/property-distributions

Returns binned histograms for length, net charge, and hydrophobic fraction.

### GET /api/v1/analytics/amino-acid-composition

Returns frequency counts for 20 standard amino acids.

### GET /api/v1/analytics/status-source-breakdown

Returns counts grouped by status, source, and backend.

### GET /api/v1/analytics/filter-rule-pass-rate

Returns pass/fail counts for 4 physicochemical filter rules.

### GET /api/v1/analytics/top-candidates?limit=N

Returns rule-based heuristic ranking of top candidates.
**Important:** This is NOT a model prediction. It uses simple heuristic rules only.

Response includes:
- `rule_based_rank`: heuristic ranking position
- `rule_based_reason`: which rules the candidate passes
- `amp_score`, `mic_ecoli`, `mic_saureus`: will be null (Not computed)


## Sequence Explorer API (v0.5.7)

### GET /api/v1/sequence-explorer/overview

Returns aggregate sequence statistics from real SQLite data.

**Response:**
```json
{
  "total_sequences": 120,
  "unique_sequences": 115,
  "duplicate_sequence_count": 3,
  "near_duplicate_pairs": 0,
  "average_length": 24.5,
  "min_length": 15,
  "max_length": 35,
  "local_demo_count": 100,
  "local_real_smoke_count": 20,
  "disclaimer": "Computational prediction only. Not experimentally validated."
}
```

### GET /api/v1/sequence-explorer/duplicates

Returns groups of peptides with identical sequences.

**Response:**
```json
{
  "duplicate_groups": [
    {
      "sequence": "KKLFKKILKYLAGPAGIGKLLGG",
      "count": 2,
      "peptide_ids": [1, 8],
      "sources": ["local_demo", "local_real_smoke"],
      "statuses": ["GENERATED", "CANDIDATE"]
    }
  ],
  "total_duplicate_sequences": 2,
  "disclaimer": "Computational prediction only. Not experimentally validated."
}
```

### GET /api/v1/sequence-explorer/similarity

Query params: `threshold` (0.0–1.0, default 0.8), `limit` (1–500, default 100)

Returns peptide pairs with normalized Levenshtein similarity >= threshold.

**Response:**
```json
{
  "threshold": 0.8,
  "pairs": [
    {
      "peptide_id_1": 1,
      "sequence_1": "KKLFKKILKYLAGPAGIGKLLGG",
      "peptide_id_2": 2,
      "sequence_2": "KKLFKKILKYLAGPAGIGKLLGA",
      "similarity": 0.9565,
      "length_1": 24,
      "length_2": 24,
      "source_1": "local_real_smoke",
      "source_2": "local_demo"
    }
  ],
  "pair_count": 1,
  "disclaimer": "Computational prediction only. Not experimentally validated."
}
```

**Important:** Similarity is descriptive only and does not imply functional equivalence.

### GET /api/v1/sequence-explorer/motif-enrichment

Returns descriptive motif statistics (not functional motif validation).

**Response:**
```json
{
  "n_terminal_position_frequencies": [
    {
      "position": 1,
      "frequencies": [{"aa": "K", "count": 3, "frequency": 0.2}]
    }
  ],
  "c_terminal_position_frequencies": [...],
  "top_dipeptides": [
    {"motif": "KK", "count": 5, "frequency": 0.03}
  ],
  "top_amino_acids": [
    {"aa": "K", "count": 40, "frequency": 0.15}
  ],
  "disclaimer": "Motif statistics are descriptive only and not functional validation."
}
```

### GET /api/v1/sequence-explorer/representatives

Query param: `limit` (1–50, default 10)

Returns rule-based representative peptides selected by quality + diversity.

**Response:**
```json
{
  "representatives": [
    {
      "peptide_id": 1,
      "sequence": "KKLFKKILKYLAGPAGIGKLLGG",
      "length": 24,
      "net_charge": 5.0,
      "hydrophobic_fraction": 0.48,
      "status": "CANDIDATE",
      "source": "local_real_smoke",
      "representative_rank": 1,
      "reason": "Valid AA, positive charge, hydrophobic fraction in target range, low similarity to previous representatives."
    }
  ],
  "disclaimer": "Rule-based representative selection only. Not a model prediction."
}
```

**Important:** This is NOT a model prediction. It uses simple heuristic rules + sequence diversity only.


## Candidate Review API (v0.5.8)

### GET /api/v1/candidate-review/candidates

Query params: `status`, `source`, `review_status`, `priority`, `selected_for_synthesis`, `min_length`, `max_length`, `min_charge`, `max_charge`, `min_hydrophobic_fraction`, `max_hydrophobic_fraction`, `limit`

Returns filtered candidates with review fields.

### GET /api/v1/candidate-review/candidates/{peptide_id}/evidence

Returns evidence card with rule-based checks.

**Response:**
```json
{
  "peptide_id": 1,
  "sequence": "KKLFKKILKYLAGPAGIGKLLGG",
  "evidence": {
    "length_rule": {"passed": true, "value": 24, "target": "15-35 aa"},
    "charge_rule": {"passed": true, "value": 5, "target": ">0"},
    "hydrophobic_rule": {"passed": true, "value": 0.48, "target": "0.40-0.70"},
    "valid_aa_rule": {"passed": true, "value": true},
    "source": "local_real_smoke",
    "amp_score": null,
    "mic_ecoli": null,
    "mic_saureus": null
  },
  "rule_based_recommendation": "SHORTLIST_CANDIDATE",
  "reasons": ["Valid amino acids", "Length 15-35 aa", "Positive net charge"],
  "disclaimer": "Rule-based review only. Not experimentally validated."
}
```

### POST /api/v1/candidate-review/candidates/{peptide_id}/review

**Body:**
```json
{
  "review_status": "SHORTLISTED",
  "priority": "HIGH",
  "selected_for_synthesis": true,
  "batch_label": "round1",
  "review_notes": "Good profile."
}
```

### POST /api/v1/candidate-review/batch-review

**Body:**
```json
{
  "peptide_ids": [1, 2, 3],
  "review_status": "SHORTLISTED",
  "priority": "HIGH",
  "selected_for_synthesis": true,
  "batch_label": "round1"
}
```

**Response:**
```json
{
  "updated_count": 3,
  "skipped_ids": [],
  "disclaimer": "Rule-based review only. Not experimentally validated."
}
```

### GET /api/v1/candidate-review/shortlist

Returns candidates where `review_status=SHORTLISTED` OR `selected_for_synthesis=true`.

### GET /api/v1/candidate-review/summary

Returns review summary statistics.

### POST /api/v1/candidate-review/export-shortlist.csv

Downloads shortlisted candidates as CSV (UTF-8 with BOM).

### POST /api/v1/candidate-review/export-shortlist.fasta

Downloads shortlisted candidates as FASTA.

### POST /api/v1/candidate-review/export-synthesis-order.csv

Downloads synthesis order template CSV with default values:
- Purity: 95%
- Scale: 5mg
- Remarks: "Computational candidate; not experimentally validated."


## Maintenance API (v0.5.9)

### GET /api/v1/maintenance/storage-summary

Returns local storage statistics including database size, artifact size, backup count, and peptide/task counts.

**Response:**
```json
{
  "database_path": "...",
  "database_exists": true,
  "database_size_mb": 0.06,
  "artifact_dir": "...",
  "artifact_dir_exists": true,
  "artifact_size_mb": 12.34,
  "artifact_file_count": 135,
  "backup_dir": "...",
  "backup_count": 3,
  "latest_backup": "ampgen_platform_20260526_120000.db",
  "peptide_count": 69,
  "task_count": 45,
  "reviewed_count": 5,
  "shortlisted_count": 3,
  "selected_for_synthesis_count": 2,
  "disclaimer": "Local maintenance only. No experimental validation is implied."
}
```

### POST /api/v1/maintenance/backup-database

Creates a timestamped backup of the SQLite database in `backups/db/`.

**Response:**
```json
{
  "backup_path": "...\\backups\\db\\ampgen_platform_20260526_120000.db",
  "size_mb": 0.06,
  "created_at": "2026-05-26T12:00:00"
}
```

### POST /api/v1/maintenance/backup-artifacts

Zips `backend/data/artifacts/` into `backups/artifacts/`.

### POST /api/v1/maintenance/create-project-snapshot

Creates a full project snapshot zip in `backups/snapshots/` including:
- README.md, VERSION.md, CHANGELOG.md
- docs/, scripts/
- Git commit/tag info
- Database copy
- Artifacts zip

Excludes: `.git`, `.env`, `node_modules`, `dist`, `__pycache__`, model weights.

### GET /api/v1/maintenance/backups

Lists all backups categorized by type.

### POST /api/v1/maintenance/restore-database

**Body:**
```json
{
  "backup_filename": "ampgen_platform_20260526_120000.db",
  "confirm": true
}
```

Requires `confirm: true`. Auto-creates pre-restore backup. Blocks if tasks are RUNNING/PENDING. Path-traversal protected.

### POST /api/v1/maintenance/cleanup-artifacts

**Body:**
```json
{
  "older_than_days": 30,
  "dry_run": true
}
```

Default `dry_run: true`. Returns files that would be deleted without removing them.

### POST /api/v1/maintenance/reset-demo-data

**Body:**
```json
{
  "confirm": true,
  "include_real_runs": false,
  "include_review_data": false
}
```

Defaults preserve LOCAL_REAL_SMOKE and review/shortlist data. Auto-creates pre-reset backup.
