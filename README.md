# AMPGen Visualization Platform

> **AMPGen Agent Platform** — 将 AMPGen 从命令行生成模型升级为支持网页提交任务、服务器 GPU 生成、P6E/P6F 自动评分、combined shortlist、Candidate Review 可视化筛选的科研平台。

---

## Current Version Status

- **Latest tag**: `v0.6.9-candidate-review` (`b54110d`)
- **Next milestone**: `v0.7.0-release-ready` (docs completion in progress)
- **Core function completion**: ~85%

---

## Core Capabilities

| Capability | Status | Details |
|---|---|---|
| SERVER_PRODUCTION single-run generation | ✅ | GPU `cuda:1`, count=3/30/300/500/1000 all passed |
| Batch Queue chunked generation | ✅ | total_count=12/50/300/500/1000 all passed |
| GPU real computation | ✅ | 2× RTX 4090, `cuda:1`, stable |
| P6E amp_score | ✅ | XGBoost AMP discriminator, Acc=0.9640, F1=0.9602, AUC=0.9943 |
| P6F S. aureus mic_saureus | ✅ | XGBoost baseline regressor, Test R²=0.8464 |
| P6F combined shortlist | ✅ | 10 ranking types (Top100/50/20 × combined/low-mic/high-amp + representative50) |
| Candidate Review Workbench | ✅ | Sort, filter, CSV download, scientific boundary banner |
| CSV / FASTA / JSON / Markdown export | ✅ | Report export center |
| Obsidian local memory | ✅ | 10 master source files + task reports |
| GitHub tag chain | ✅ | v0.6.0–v0.6.9 all remote visible |

---

## Current Null / Unsupported Fields

| Field | Status | Reason |
|---|---|---|
| `mic_ecoli` | `null` | E. coli data is git-lfs pointer; no model trained |
| `toxicity_risk` | `null` | No toxicity prediction model integrated |
| `hemolysis_risk` | `null` | No hemolysis prediction model integrated |
| Wet-lab validation | N/A | Platform is computational only |

---

## Port Rules

| Service | Backend | Frontend |
|---|---|---|
| **AMPGen** | `18601` | `18600` |
| **STAMP** | `8001` | `8080` |

- AMPGen must **not** occupy 8001/8080.
- STAMP ports are reserved and must **not** be modified.
- Local frontend dev server may use 3000; server deployment must use 18600.

---

## Scientific Boundary (Summary)

> **All scores are computational predictions. None are experimentally validated.**

- `amp_score` — P6E XGBoost AMP discriminator **prediction**, not an experimental MIC.
- `mic_saureus` — P6F XGBoost baseline regressor **prediction**, not an experimentally measured MIC.
- `mic_ecoli` — Currently `null`. No model or data available.
- `shortlist` / `representative` — Computational screening and deduplication. Not experimental validation.
- **All candidate peptides require wet-lab validation** before any experimental conclusion can be drawn.

**Do not forge MIC, toxicity, hemolysis, or wet-lab conclusions.**

See [docs/SCIENCE_BOUNDARY.md](./docs/SCIENCE_BOUNDARY.md) for full details.

---

## Quick Start

### Local Development

```powershell
# Terminal 1: Backend
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 18601

# Terminal 2: Frontend
cd app
npm run dev        # http://localhost:3000 (dev mode)
```

### Server Deployment (stamp218)

```bash
# Backend
ssh xh@192.168.31.218
cd /home/xh/kxc/ampg可视化/backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 18601

# Frontend
cd /home/xh/kxc/ampg可视化/app
npm run preview -- --host 0.0.0.0 --port 18600
```

---

## Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide React
- **Backend**: FastAPI, SQLAlchemy, SQLite, Uvicorn
- **Generation Engine**: AMPGen (evodiff, GPU `cuda:1` on stamp218)
- **Scoring**: P6E XGBoost AMP discriminator, P6F XGBoost baseline MIC regressor
- **Testing**: pytest, TestClient

---

## Project Structure

```
.
├── app/                          # React frontend
│   ├── src/
│   │   ├── api/                 # API clients
│   │   ├── pages/               # Page components
│   │   └── ...
│   └── package.json
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── routers/             # API routers
│   │   ├── runners/             # Background task runners
│   │   ├── scorers/             # P6E / P6F scoring modules
│   │   ├── models/              # SQLAlchemy models
│   │   └── services/            # Business services
│   ├── tests/                   # pytest tests
│   └── requirements.txt
├── scripts/                      # Startup / healthcheck / smoke scripts
├── docs/                         # Documentation
│   ├── V070_RELEASE_NOTES.md
│   ├── USER_GUIDE_CANDIDATE_REVIEW.md
│   ├── SCIENCE_BOUNDARY.md
│   ├── RUNTIME_CONFIG_AND_COMPUTE_BOUNDARY.md
│   ├── DEPLOYMENT_STAMP218.md
│   ├── ARTIFACTS_AND_REPORTS.md
│   ├── VERSION_TAGS.md
│   ├── LOCAL_AGENT_INTEGRATION_PLAN.md
│   ├── RUNBOOK.md
│   └── ...
├── README.md                     # This file
└── .env.example                  # Environment template (no real values)
```

---

## GitHub Notes

**Do not commit**:

- `.env` files (real credentials)
- SQLite databases (`*.db`)
- `reports/` / `artifacts/` / `server-artifacts/`
- Model weight files (`.pt`, `.pth`, `.ckpt`, `.safetensors`, `.bin`, `.joblib`)
- `venv/` / `node_modules/` / `dist/` (except server preview build)
- Obsidian vault
- Tokens, passwords, or keys

Only platform **source code** and **documentation** belong in the GitHub repository.

---

## License

Internal use. Experimental data must not be used as the sole basis for clinical or commercial decisions without independent wet-lab validation.

---

*Current version: v0.6.9-candidate-review*  
*Next: v0.7.0-release-ready (docs completion in progress)*
