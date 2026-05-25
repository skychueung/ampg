# AMPGen Agent Platform Changelog

## v0.5-report-export (2026-05-25)

### Added
- **Report Export Center**: ReportExport page upgraded from demo data to real API-driven export center.
- **Candidates CSV export**: `GET /reports/candidates.csv` with utf-8-sig encoding, all peptide fields, empty values for null scores.
- **Candidates FASTA export**: `GET /reports/candidates.fasta` with `>peptide_{id}|status=|source=|length=|charge=` headers.
- **Tasks JSON export**: `GET /reports/tasks.json` with full task metadata (including cancel fields).
- **Generation Run JSON report**: `GET /reports/generation-runs/{id}.json` with run + task + peptides + scientific_boundary.
- **Generation Run Markdown report**: `GET /reports/generation-runs/{id}.md` with full structured report including Scientific Boundary and Next Experimental Validation sections.
- **List generation runs**: `GET /generation-runs` returns all runs for selection.
- **Frontend export UI**: 5 export buttons (CSV, FASTA, Tasks JSON, Run JSON, Run Markdown) + run selector dropdown.

## v0.4-task-cancellation (2026-05-25)

### Added
- **Safe task cancellation**: `POST /api/v1/tasks/{id}/cancel` sets `cancel_requested=true`. Runner polls `cancel_requested` every 1s and safely terminates subprocess (SIGTERM → 5s timeout → SIGKILL).
- **PID tracking**: `Task.process_pid` stores subprocess PID for external termination.
- **CANCELLED status**: Both `Task` and `GenerationRun` support `CANCELLED` terminal state.
- **Frontend cancel button**: Generation and TaskCenter pages show "Cancel Task" button for `PENDING`/`RUNNING` tasks.
- **Cancel smoke test**: `scripts/smoke_cancel_local_real.ps1` validates cancellation end-to-end.

## v0.3-local-real-async (2026-05-25)

### Added
- **Async backend execution**: Generation runs now spawn `threading.Thread` immediately after DB record creation. POST returns `PENDING` in < 200ms instead of blocking for 45–60s.
- **Frontend polling**: Generation page polls `run`, `task`, and `logs` endpoints every 3s with parallel `Promise.all`.
- **Live progress UI**: Progress bar (progress/total), elapsed timer (MM:SS), and task message display during RUNNING state.
- **Live logs panel**: Terminal-style dark panel showing last 5 log lines in real time.
- **Artifact logs**: `GET /tasks/{id}/logs` returns `artifact_logs.{stdout.log, stderr.log}` from subprocess capture.
- **TaskCenter artifact logs**: Collapsible dark panels for stdout/stderr per task.
- **LOCAL_REAL_SMOKE end-to-end**: Full flow verified — POST → PENDING → RUNNING → SUCCEEDED in ~40s, with real peptide insertion and `amp_score=null`.
- **Git baseline**: Repository initialized, `.gitignore` configured, commit `20a014d`, tag `v0.3-local-real-async`.
- **One-click scripts**: `start_backend.ps1`, `start_frontend.ps1`, `start_all.ps1`, `stop_backend.ps1`, `stop_frontend.ps1`, `healthcheck.ps1`.
- **Smoke tests**: `smoke_local_demo.ps1` (count=2) and `smoke_local_real.ps1` (count=1) for automated validation.
- **Documentation**: README, VERSION, CHANGELOG, DEMO_GUIDE, ARCHITECTURE, SCIENTIFIC_BOUNDARY, API_CONTRACT, RUNBOOK, ARIS_LITE_REVIEW_PROTOCOL.

### Fixed
- `test_task_status_transitions` race condition: LOCAL_DEMO count=1 completes so fast in test DB that immediate query returns `SUCCEEDED`. Assertion widened to allow `("PENDING", "RUNNING", "SUCCEEDED")`.

### Backend
- `backend/app/routers/generation.py` — async creation with background thread spawn.
- `backend/app/runners/local_real_smoke_runner.py` — cross-thread safe DB session, stdout/stderr capture, artifact writing.
- `backend/app/runners/local_demo_runner.py` — same async signature.
- `backend/app/routers/tasks.py` — logs endpoint with `artifact_logs` map.
- `backend/tests/conftest.py` — `check_same_thread=False` for test DB background thread visibility.

### Frontend
- `app/src/pages/Generation.tsx` — polling, progress, timer, logs.
- `app/src/pages/TaskCenter.tsx` — artifact_logs display.

## v0.2-local-real-smoke (2026-05-20)

### Added
- Three-tier backend: LOCAL_DEMO (≤5), LOCAL_REAL_SMOKE (≤2), SERVER_PRODUCTION (BLOCKED).
- Frontend API client layer (`src/api/*`).
- CandidateLibrary, TaskCenter, Generation switched to real APIs.
- `SERVER_PRODUCTION` always BLOCKED with disclaimer.

## v0.1-frontend-demo (2026-05-15)

### Added
- React + Vite + TypeScript frontend scaffold.
- Dashboard, Generation, CandidateLibrary, TaskCenter pages with mock data.
- Tailwind CSS + Framer Motion UI.
- i18n framework (English/Chinese).
