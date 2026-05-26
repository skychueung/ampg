# AMPGen Agent Platform — Version Matrix

## Current Release

**v0.5.4-ampgen-visualizer**

Release Date: 2026-05-26
Git Tag: `v0.5.4-ampgen-visualizer`

Previous: v0.5.3-frontend-code-splitting (2026-05-26, d49d3da)

## v0.5.4 Highlights

- **AMPGen Workflow Visualizer** (`/ampgen-workflow`): New page visualizing the complete AMPGen pipeline — backend modes, workflow steps, and real-time system status.
- **Generation Run Detail** (`/generation-runs/:runId`): New page showing full run lifecycle — summary, visual timeline, task status, logs, artifacts, and generated peptides.
- **Artifacts API** (`GET /api/v1/generation-runs/{run_id}/artifacts`): Secure endpoint listing artifact file status (stdout.log, stderr.log, generated_sequences.csv, generated_sequences.fasta) with path-traversal protection.
- **Task → Run linkage**: Task API now returns `related_generation_run_id` for generation tasks.
- **Cross-page navigation**: Generation → Run Detail, TaskCenter → Run Detail, CandidateLibrary → Source Run.
- **Scientific boundary maintained**: All scores remain `Not computed` for LOCAL_DEMO and LOCAL_REAL_SMOKE. Artifacts empty for LOCAL_DEMO is by design (in-memory generation).

## Capability Matrix

| Version | Capability | Status |
|---------|-----------|--------|
| v0.1 | Frontend demo (mock data) | ✅ |
| v0.2 | Backend + local real smoke (sync blocking) | ✅ |
| v0.3 | Frontend real API integration | ✅ |
| v0.3 | Async task execution (threading.Thread) | ✅ |
| v0.3 | Frontend polling (3s interval) | ✅ |
| v0.3 | TaskCenter live logs + artifact_logs | ✅ |
| v0.3 | LOCAL_REAL_SMOKE end-to-end (count=1) | ✅ |
| v0.4 | Safe task cancellation | ✅ |
| v0.5 | Report Export Center (real API) | ✅ |
| v0.5.1 | Remove fake demo amp_score / MIC values | ✅ |
| v0.5.2 | Dashboard + ReportExport + PeptideDetail real API | ✅ |
| v0.5.3 | Frontend code splitting (1333 KB → 244 KB main bundle) | ✅ |
| v0.5.4 | AMPGen Workflow Visualizer | ✅ |
| v0.5.4 | Generation Run Detail page | ✅ |
| v0.5.4 | Artifacts listing API | ✅ |
| v0.5.4 | Cross-page run navigation | ✅ |

## Upcoming (Not in v0.5.4)

| Capability | Target |
|-----------|--------|
| Server production backend | BLOCKED |
| XGBoost AMP discriminator | BLOCKED |
| MIC scorer integration | BLOCKED |
| WebSocket real-time push | BLOCKED |
| Full ARIS multi-agent backend | BLOCKED |
