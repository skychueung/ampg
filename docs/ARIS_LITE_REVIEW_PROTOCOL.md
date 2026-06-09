# ARIS-Lite Review Protocol

## Overview

ARIS-Lite (Adversarial Review & Inspection System) is a four-role review protocol designed to ensure every release of the AMPGen Agent Platform meets technical, scientific, UX, and evidentiary standards before deployment.

**Current status (v0.3):** Design reference and manual checklist. Full automated multi-agent backend system deferred to P4+.

---

## The Four Roles

### 1. API Contract Reviewer

**Responsibility:** Verify all API endpoints behave according to the published contract.

**Checklist:**

| # | Check | Pass Criteria |
|---|-------|---------------|
| 1.1 | `POST /generation-runs` returns immediately (< 500ms) | Timing verified |
| 1.2 | `POST /generation-runs` returns `PENDING` for async backends | Status field = "PENDING" |
| 1.3 | Count limits enforced at router level | LOCAL_DEMO ≤ 5, LOCAL_REAL_SMOKE ≤ 2, SERVER_PRODUCTION = BLOCKED |
| 1.4 | `GET /generation-runs/{id}/peptides` returns peptides after completion | peptides array non-empty when SUCCEEDED |
| 1.5 | `GET /tasks/{id}/logs` returns `artifact_logs` map | stdout.log and stderr.log present for real smoke |
| 1.6 | All responses include `disclaimer` field | Field exists and contains boundary text |
| 1.7 | `GET /api/health` returns 200 with all subsystems ok | database, artifact_dir both "ok" |
| 1.8 | `GET /api/v1/system/ampgen-probe` detects AMPGen installation | available = true, scripts list non-empty |

**Verdict:**
- **PASS** — All checks above pass.
- **NEEDS_FIX** — Any check fails. Fix before release.

---

### 2. Scientific Boundary Reviewer

**Responsibility:** Ensure no fake scientific data is produced and all claims are within the platform's actual capabilities.

**Checklist:**

| # | Check | Pass Criteria |
|---|-------|---------------|
| 2.1 | LOCAL_REAL_SMOKE peptides have `amp_score = null` | Verified in DB/API response |
| 2.2 | LOCAL_REAL_SMOKE peptides have `mic_ecoli = null` | Verified in DB/API response |
| 2.3 | LOCAL_REAL_SMOKE peptides have `mic_saureus = null` | Verified in DB/API response |
| 2.4 | LOCAL_DEMO scores are explicitly labeled as heuristic | UI or API docs state they are not model predictions |
| 2.5 | No experimental validation claims in UI text | No "validated", "confirmed", "proven" language |
| 2.6 | Disclaimer visible on all result pages | "Computational prediction only..." shown |
| 2.7 | BLOCKED tasks do not silently fail | User sees clear BLOCKED message with reason |
| 2.8 | CandidateLibrary shows "Not computed" for null scores | UI does not render 0 or fake values |

**Verdict:**
- **PASS** — All checks above pass.
- **NEEDS_FIX** — Any check fails. Fix before release.

---

### 3. UX State Reviewer

**Responsibility:** Verify frontend state management, polling behavior, and user feedback are correct and robust.

**Checklist:**

| # | Check | Pass Criteria |
|---|-------|---------------|
| 3.1 | Generation page polls while RUNNING/PENDING | Network tab shows repeated requests every 3s |
| 3.2 | Polling stops on terminal status | No requests after SUCCEEDED/FAILED/BLOCKED |
| 3.3 | Progress bar updates during RUNNING | progress/total reflected in UI |
| 3.4 | Elapsed timer increments every second | Timer visible and increasing |
| 5.5 | Live logs panel shows latest lines | Last 3–5 log lines visible in dark panel |
| 3.6 | TaskCenter shows real tasks from API | No demo data fallback after API failure |
| 3.7 | CandidateLibrary shows real peptides from API | No demo data fallback after API failure |
| 3.8 | BLOCKED state shows red banner with reason | Clear error message, no silent failure |
| 3.9 | SUCCEEDED state shows navigation buttons | "查看候选肽库" and "查看任务中心" visible |
| 3.10 | Frontend build passes with 0 errors | `npm run build` exits 0 |

**Verdict:**
- **PASS** — All checks above pass.
- **NEEDS_FIX** — Any check fails. Fix before release.

---

### 4. Evidence Auditor

**Responsibility:** Verify all claims in the release report are backed by actual evidence (logs, screenshots, test results).

**Checklist:**

| # | Check | Pass Criteria |
|---|-------|---------------|
| 4.1 | pytest output attached or referenced | Screenshot or text showing 24/24 pass |
| 4.2 | npm build output attached or referenced | Screenshot or text showing 0 errors |
| 4.3 | LOCAL_REAL_SMOKE E2E trace exists | POST → poll → SUCCEEDED sequence documented |
| 4.4 | Generated peptide sequence recorded | Actual sequence, length, properties logged |
| 4.5 | amp_score=null verified in response | API response snippet showing null values |
| 4.6 | artifact_logs captured | stdout.log + stderr.log content present |
| 4.7 | Git commit hash recorded | Exact commit SHA in report |
| 4.8 | Git tag recorded | Tag name `v0.3-local-real-async` in report |
| 4.9 | No uncommitted changes in release | `git status --short` returns empty |
| 4.10 | .gitignore excludes data/artifacts and *.db | File content reviewed |

**Verdict:**
- **PASS** — All checks above pass.
- **NEEDS_FIX** — Any check fails. Fix before release.

---

## Review Workflow

```
1. Developer completes feature/fix
   ↓
2. Self-review against this protocol
   ↓
3. Run pytest (24/24)
   ↓
4. Run npm run build (0 errors)
   ↓
5. Run smoke_local_demo.ps1 (PASS)
   ↓
6. Run smoke_local_real.ps1 (PASS)
   ↓
7. Check git status (clean)
   ↓
8. Git commit + tag
   ↓
9. Generate release report with evidence
   ↓
10. All four roles sign off (manual or automated)
    ↓
11. Release sealed
```

## Sign-off Template

| Role | Reviewer | Date | Verdict |
|------|----------|------|---------|
| API Contract Reviewer | __________ | ______ | PASS / NEEDS_FIX |
| Scientific Boundary Reviewer | __________ | ______ | PASS / NEEDS_FIX |
| UX State Reviewer | __________ | ______ | PASS / NEEDS_FIX |
| Evidence Auditor | __________ | ______ | PASS / NEEDS_FIX |

**Release approved only if all four roles PASS.**

## Deferred to P4+ (Full ARIS)

- Automated multi-agent backend with LangChain/LangGraph
- LLM-powered code review agent
- LLM-powered scientific boundary checker
- Automated UI test agent (Playwright)
- Evidence collection bot (auto-screenshot, auto-trace)
