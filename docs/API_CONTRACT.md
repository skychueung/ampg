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
