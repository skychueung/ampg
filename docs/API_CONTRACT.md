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
