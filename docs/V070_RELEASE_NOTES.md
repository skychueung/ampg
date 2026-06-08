# AMPGen v0.7.0 Release Notes Draft

> **Status**: Draft — docs completion in progress.  
> **Do not tag v0.7.0 until this document is finalized and all A-class gaps are closed.**

---

## Release Title

AMPGen Visualization Platform v0.7.0 — Generation + Dual Scoring + Candidate Screening + Frontend Visualization

---

## Foundation

This release builds on v0.6.0 through v0.6.9, which established:

- Local MVP seal (v0.6.0)
- Server GPU smoke config (v0.6.1)
- SERVER_PRODUCTION runner (v0.6.2)
- UI status + runtime-config API (v0.6.3)
- Batch Queue MVP (v0.6.4)
- GPU runner fix (v0.6.5)
- Backend deadlock fix (v0.6.6)
- P6E XGBoost AMP discriminator (v0.6.7)
- P6F S. aureus MIC baseline regressor (v0.6.8)
- Candidate Review visualization (v0.6.9)

---

## v0.7.0 Goal

Mark the AMPGen Visualization Platform as having completed the **"Generation + Dual Scoring + Candidate Screening + Frontend Visualization"** phase.

---

## Completed Capabilities

| Capability | Evidence | Status |
|---|---|---|
| GPU real generation | cuda:1, 2× RTX 4090, 1000/1000 pass | ✅ |
| SERVER_PRODUCTION single-run | count=3/30/300/500/1000 all SUCCEEDED | ✅ |
| Batch Queue chunked generation | total_count=12/50/300/500/1000 all SUCCEEDED | ✅ |
| Backend deadlock fix | start_new_session + 600s timeout, no hang | ✅ |
| P6E amp_score | XGBoost discriminator, Acc=0.9640, F1=0.9602, AUC=0.9943 | ✅ |
| P6F mic_saureus | XGBoost baseline regressor, Test R²=0.8464, RMSE=0.5456 | ✅ |
| P6F 1000/1000 scored generation | 2000 peptides, amp_score + mic_saureus both filled | ✅ |
| Combined shortlist (10 ranking types) | Top100/50/20 × combined/low-mic/high-amp + representative50 | ✅ |
| Candidate Review Workbench | Sort, filter, CSV download, scientific boundary banner | ✅ |
| GitHub v0.6.0–v0.6.9 tags | All remote visible, chain intact | ✅ |
| Obsidian local memory | 10 master source files + reports | ✅ |

---

## Incomplete Capabilities (Planned for v0.8.0+)

| Capability | Reason | Status |
|---|---|---|
| mic_ecoli | E. coli data is git-lfs pointer, no real data; no model | ❌ null |
| toxicity_risk | No toxicity prediction model integrated | ❌ null |
| hemolysis_risk | No hemolysis prediction model integrated | ❌ null |
| Wet-lab validation | Platform is computational only; wet lab is external | ❌ N/A |
| systemd / supervisor long-process management | Backend/frontend currently started manually | ❌ Planned |
| Full UI polish | Pagination, favorites, copy-sequence, tooltips | ❌ Planned |

---

## Release Readiness Conclusion

**Before this task**: `RELEASE_READY_WITH_DOCS_GAP` — core functions at ~85%, documentation gaps identified.

**After this task**: Docs completion required before `v0.7.0-release-ready` tag.

---

## Scientific Boundary Statement

**All scores are computational predictions. None are experimentally validated.**

- `amp_score` — P6E XGBoost AMP discriminator prediction. Not an experimental MIC.
- `mic_saureus` — P6F XGBoost baseline regressor prediction. Not an experimentally measured MIC.
- `mic_ecoli` — Currently null. No model or data available.
- `toxicity_risk` — Currently null. No model integrated.
- `hemolysis_risk` — Currently null. No model integrated.
- `shortlist` / `representative` — Computational screening and deduplication. Not experimental validation.

**Do not forge MIC, toxicity, hemolysis, or wet-lab conclusions.**

---

## Port Reference

| Service | Backend | Frontend |
|---|---|---|
| AMPGen | 18601 | 18600 |
| STAMP | 8001 | 8080 |

- AMPGen must not occupy 8001/8080.
- STAMP ports are reserved and must not be modified.

---

## GitHub Notes

Do **not** commit:

- `.env` files (real credentials)
- SQLite databases
- `reports/` directories
- `artifacts/` / `server-artifacts/`
- Model weight files (`.pt`, `.pth`, `.ckpt`, `.safetensors`, `.bin`, `.joblib`)
- `venv/` / `node_modules/` / `dist/`
- Obsidian vault

Only platform code and documentation belong in the GitHub repository.

---

*Draft generated: 2026-06-08*  
*Next step: Finalize docs, then create `v0.7.0-release-ready` tag.*
