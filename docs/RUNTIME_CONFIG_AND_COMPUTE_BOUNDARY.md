# Runtime Config and Compute Boundary

> **Local machine = development only. Real computation = stamp218 server only.**

---

## Default Runtime Limits

| Config | Default Value | Purpose |
|---|---|---|
| `SERVER_PRODUCTION_MAX_COUNT` | **10** | Maximum peptides per single SERVER_PRODUCTION run |
| `SERVER_BATCH_MAX_TOTAL_COUNT` | **50** | Maximum total peptides per Batch Queue request |
| `SERVER_BATCH_CHUNK_SIZE` | 10 | Peptides per chunk |
| `SERVER_BATCH_MAX_CONCURRENCY` | 1 | Concurrent chunks (sequential execution) |

**Large-scale validation** (e.g., count=300/500/1000) may temporarily raise these limits, but **must be restored to 10/50 immediately after validation**.

---

## Local Machine Responsibilities

The local machine (Windows development environment) is **only** for:

- Code development (FastAPI backend, React frontend)
- Lightweight mock tests and pytest (no real model calls)
- `npm run build` (frontend production build)
- Documentation writing and updating
- Report compilation and output
- Code review and reasoning review
- Lightweight smoke scripts (LOCAL_DEMO / mock mode only)

---

## Local Machine Prohibitions

| Prohibition | Reason |
|---|---|
| **Do NOT run real AMPGen generation** | Local lacks GPU; CPU mode takes 40–120s per peptide |
| **Do NOT run SERVER_PRODUCTION** | Must run on stamp218 with cuda:1 |
| **Do NOT run LOCAL_REAL_SMOKE** | CPU mode is prohibitively slow; use stamp218 GPU |
| **Do NOT do GPU computation** | Local machine has no CUDA GPU for AMPGen |
| **Do NOT execute large-scale batch generation** | Use stamp218 Batch Queue instead |

---

## Server stamp218 Responsibilities

Real computation **must** execute on `stamp218` (192.168.31.218):

- SERVER_PRODUCTION single-run generation
- LOCAL_REAL_SMOKE real model calls (GPU mode, `cuda:1`)
- Batch Queue chunked generation
- GPU computation (default `cuda:1`, 2× RTX 4090)
- P6E XGBoost AMP discriminator scoring
- P6F S. aureus MIC baseline regressor scoring
- ESM embedding computation (future)

**Server working directory**: `/home/xh/kxc/ampg可视化`

---

## AMPGen Original Model Directory (Read-Only)

| Path | Status | Note |
|---|---|---|
| `/home/xh/kxc/ampgenkxc/AMPGen` | **Read-only** | Original AMPGen algorithm source |

- Do **not** modify this directory.
- Do **not** upload visualization platform files into it.
- Do **not** mix original model directory with visualization platform directory.

---

## Default Run Prohibitions

The following must **not** run by default:

- `SERVER_PRODUCTION` — only run on stamp218, count ≤ 10 default
- `Batch Queue` — only run on stamp218, total_count ≤ 50 default
- `LOCAL_REAL_SMOKE` — only run on stamp218 GPU; local CPU mode is too slow

---

## Port Boundaries

| Service | Backend | Frontend | Reserved For |
|---|---|---|---|
| AMPGen | **18601** | **18600** | AMPGen Visualization Platform |
| STAMP | **8001** | **8080** | STAMP Platform |

**Rules**:
- AMPGen must **not** occupy 8001 or 8080.
- STAMP ports are reserved and must **not** be modified.
- AMPGen server tasks uniformly use 18601/18600.
- Local frontend dev server may use 3000, but server deployment must use 18600.

---

## Candidate Review API (Read-Only)

```
GET /api/v1/candidate-review/p6f-shortlist?type={type}
```

- This is a **read-only** API.
- It does **not** run any computation.
- It reads pre-generated shortlist CSV files from the server reports directory.
- It does **not** modify CSV files.
- It does **not** trigger model inference.

---

## Compute Boundary Summary

| Task | Where | Allowed? |
|---|---|---|
| Code development | Local | ✅ |
| pytest / mock tests | Local | ✅ |
| npm build | Local | ✅ |
| Documentation | Local | ✅ |
| SERVER_PRODUCTION count=3 | stamp218 | ✅ |
| SERVER_PRODUCTION count=10 | stamp218 | ✅ (default) |
| SERVER_PRODUCTION count=1000 | stamp218 | ✅ (temp raise, must restore) |
| Batch Queue total_count=50 | stamp218 | ✅ (default) |
| Batch Queue total_count=1000 | stamp218 | ✅ (temp raise, must restore) |
| LOCAL_REAL_SMOKE | Local | ❌ |
| GPU computation | Local | ❌ |
| Modify `/home/xh/kxc/ampgenkxc/AMPGen` | Anywhere | ❌ |

---

*Last updated: 2026-06-08 (v0.6.9-candidate-review)*
