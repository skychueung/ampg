# AMPGen Agent Platform — Version Matrix

## Current Release

**v0.4-task-cancellation**

Release Date: 2026-05-25
Git Tag: `v0.4-task-cancellation`
Git Commit: `c1ca355`

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
