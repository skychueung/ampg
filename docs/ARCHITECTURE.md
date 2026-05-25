# AMPGen Agent Platform — Architecture

## Overview

AMPGen Agent Platform is a single-node web application with a React frontend and FastAPI backend. It orchestrates AMP (Antimicrobial Peptide) generation using the local AMPGen/evodiff model.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  http://localhost:3000                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP
┌──────────────────────▼──────────────────────────────────────┐
│                    Frontend (Vite)                          │
│  React 18 + TypeScript + Tailwind CSS + Framer Motion       │
│  Port: 3000                                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API (fetch/axios)
                       │ CORS enabled
┌──────────────────────▼──────────────────────────────────────┐
│                    Backend (Uvicorn)                        │
│  FastAPI + SQLAlchemy + SQLite                              │
│  Port: 8001                                                 │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routers   │  │   Models    │  │      Runners        │  │
│  │  /api/v1/*  │  │  SQLAlchemy │  │  threading.Thread   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                    │             │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────────▼──────────┐  │
│  │  Services   │  │  SQLite DB  │  │  subprocess.run()   │  │
│  │  Business   │  │  ampgen_    │  │  AMPGen scripts     │  │
│  │  Logic      │  │  platform.db│  │  (evodiff)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                       │
                       │ subprocess
┌──────────────────────▼──────────────────────────────────────┐
│                 AMPGen (External)                           │
│  D:\Desktop\ampg\AMPGen                                      │
│  evodiff unconditional/conditional generation                │
│  CPU-only mode                                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Generation Flow (LOCAL_REAL_SMOKE)

```
1. User clicks Generate
   → Frontend POST /api/v1/generation-runs

2. Backend router validates count limits
   → Creates Task (PENDING) + GenerationRun (PENDING)
   → Spawns threading.Thread
   → Returns 200 { status: "PENDING" } immediately

3. Background Thread
   → UPDATE Task → RUNNING
   → subprocess.run(ampgen_script, cwd=AMPGEN_ROOT, timeout=600)
   → Parse generated_sequences.csv
   → INSERT peptides (amp_score=null, mic=null)
   → Write FASTA + stdout.log + stderr.log → artifact_dir
   → UPDATE Task → SUCCEEDED + message + completed_at

4. Frontend Polling (every 3s)
   → GET /generation-runs/{run_id}
   → GET /tasks/{task_id}
   → GET /tasks/{task_id}/logs
   → Updates UI: status, progress, elapsed, logs, peptides
```

## Database Schema

### tasks
| Column | Type | Description |
|--------|------|-------------|
| id | Integer | PK |
| type | String | "AMP Generation" |
| status | String | PENDING / RUNNING / SUCCEEDED / FAILED / BLOCKED |
| progress | Integer | Current progress |
| total | Integer | Total items |
| message | String | Human-readable status message |
| log_text | Text | Summary logs |
| artifact_dir | String | Path to artifact directory |
| error_message | String | Error details if FAILED |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update |
| completed_at | DateTime | Completion timestamp |

### generation_runs
| Column | Type | Description |
|--------|------|-------------|
| id | Integer | PK |
| task_id | Integer | FK → tasks |
| mode | String | Sequence-based / MSA-based / MSA-conditional |
| backend | String | LOCAL_DEMO / LOCAL_REAL_SMOKE / SERVER_PRODUCTION |
| count | Integer | Number of peptides to generate |
| min_length | Integer | Min sequence length |
| max_length | Integer | Max sequence length |
| temperature | Float | Sampling temperature |
| top_p | Float | Nucleus sampling p |
| status | String | PENDING / RUNNING / SUCCEEDED / FAILED / BLOCKED |
| created_at | DateTime | Creation timestamp |
| completed_at | DateTime | Completion timestamp |

### peptide_candidates
| Column | Type | Description |
|--------|------|-------------|
| id | Integer | PK |
| sequence | String | Amino acid sequence |
| length | Integer | Sequence length |
| net_charge | Float | Net charge at pH 7 |
| hydrophobic_fraction | Float | Hydrophobic residue fraction |
| hydrophobicity | Float | GRAVY-like score |
| valid_aa | Boolean | All valid amino acids |
| amp_score | Float | AMP prediction score (null if not computed) |
| mic_ecoli | Float | MIC vs E. coli (null if not computed) |
| mic_saureus | Float | MIC vs S. aureus (null if not computed) |
| toxicity_risk | Float | Toxicity risk score |
| hemolysis_risk | Float | Hemolysis risk score |
| status | String | GENERATED / FILTERED / SELECTED / REJECTED |
| source | String | local_demo / local_real_smoke / server_production |
| generation_run_id | Integer | FK → generation_runs |
| notes | Text | Additional notes |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update |

## Tier System

| Tier | Count Limit | Behavior | Use Case |
|------|-------------|----------|----------|
| LOCAL_DEMO | ≤ 5 | In-process fast generation with heuristic scores | UI testing, quick demos |
| LOCAL_REAL_SMOKE | ≤ 2 | Real AMPGen subprocess call, amp_score=null | Validation, smoke testing |
| SERVER_PRODUCTION | BLOCKED | Not implemented | Future remote server |

## Async Design

No Celery, Redis, or RQ. Background execution uses Python `threading.Thread` only.

- Each generation request spawns one thread.
- Thread opens a fresh SQLAlchemy session (`SessionLocal()`).
- Thread executes subprocess, parses output, updates DB, closes session.
- Main FastAPI worker remains free to handle other requests.

This is sufficient for single-node, low-concurrency use (≤2 concurrent real smoke tasks).
