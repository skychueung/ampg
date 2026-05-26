# AMPGen Agent Platform — Version Matrix

## Current Release

**v0.5.2-dashboard-report-preview-fix**

Release Date: 2026-05-26
Git Tag: `v0.5.2-dashboard-report-preview-fix`
Git Commit: `76550e2`

Previous: v0.5.1-hotfix (2026-05-26, cf5423b)

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
| v0.3 | pytest 24/24 pass | ✅ |
| v0.3 | npm run build 0 errors | ✅ |
| v0.4 | Safe task cancellation (cancel_requested + PID) | ✅ |
| v0.4 | CANCELLED status for Task & GenerationRun | ✅ |
| v0.4 | Frontend cancel button | ✅ |
| v0.4 | Cancel smoke test script | ✅ |
| v0.4 | pytest 29/29 pass | ✅ |
| v0.5 | Report Export Center (real API) | ✅ |
| v0.5 | Candidates CSV / FASTA export | ✅ |
| v0.5 | Tasks JSON export | ✅ |
| v0.5 | Generation Run JSON / Markdown report | ✅ |
| v0.5 | List generation runs API | ✅ |
| v0.5 | Export smoke test script | ✅ |
| v0.5 | Report Export Center (real API) | ✅ |
| v0.5 | Candidates CSV / FASTA export | ✅ |
| v0.5 | Tasks JSON export | ✅ |
| v0.5 | Generation Run JSON / Markdown report | ✅ |
| v0.5 | List generation runs API | ✅ |
| v0.5 | Export smoke test script | ✅ |
| v0.5 | pytest 36/36 pass | ✅ |
| v0.5.1 | Remove fake demo amp_score / MIC values | ✅ |
| v0.5.1 | LOCAL_DEMO scores set to null | ✅ |
| v0.5.1 | Database cleanup script for historical fake scores | ✅ |
| v0.5.1 | pytest 40/40 pass | ✅ |
| — | Git baseline initialized | ✅ |
| — | One-click start/stop scripts | ✅ |
| — | Health check + smoke tests | ✅ |

## Upcoming (Not in v0.3)

| Capability | Target |
|-----------|--------|
| Server production backend | P4+ |
| XGBoost AMP discriminator | P4+ |
| MIC scorer integration | P4+ |
| WebSocket real-time push | P4+ |
| Full ARIS multi-agent backend | P4+ |
| ARIS-Lite automated review | P3.5+ |
