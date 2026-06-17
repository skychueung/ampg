# AMPGen Visualization Platform

> AMPGen Agent Platform — A web-based research platform for peptide generation, server-side GPU task submission, computational scoring, combined shortlist ranking, and candidate review visualization.

---

## Current Version Status

* **Latest tag**: `v0.6.9-candidate-review`
* **Next milestone**: `v0.7.0-release-ready`
* **Core function completion**: ~85%

---

## Overview

AMPGen Visualization Platform upgrades AMPGen from a command-line generation model into an interactive research platform.

The platform supports:

* Web-based generation task submission
* Server-side GPU generation workflow
* Automatic computational scoring
* Combined shortlist ranking
* Candidate Review Workbench
* CSV / FASTA / JSON / Markdown export
* Scientific boundary reminders for computational predictions

This repository contains platform source code and documentation only.

It does **not** include private server addresses, credentials, model weights, runtime artifacts, databases, or experimental validation data.

---

## Core Capabilities

| Capability                           | Status    | Details                                           |
| ------------------------------------ | --------- | ------------------------------------------------- |
| Single-run generation                | Completed | Small, medium, and large count tests passed       |
| Batch Queue generation               | Completed | Chunked generation workflow passed                |
| GPU computation workflow             | Completed | Server-side GPU workflow validated                |
| AMP score prediction                 | Completed | XGBoost AMP discriminator integrated              |
| S. aureus MIC prediction             | Completed | XGBoost baseline regressor integrated             |
| Combined shortlist                   | Completed | Multiple ranking strategies supported             |
| Candidate Review Workbench           | Completed | Sort, filter, inspect, and export candidates      |
| CSV / FASTA / JSON / Markdown export | Completed | Report export center available                    |
| Local documentation memory           | Completed | Project notes and task reports maintained locally |
| Version tag chain                    | Completed | v0.6.0–v0.6.9 completed                           |

---

## Current Null / Unsupported Fields

| Field              | Status       | Reason                                            |
| ------------------ | ------------ | ------------------------------------------------- |
| `mic_ecoli`        | `null`       | E. coli dataset is unavailable for model training |
| `toxicity_risk`    | `null`       | No toxicity prediction model integrated           |
| `hemolysis_risk`   | `null`       | No hemolysis prediction model integrated          |
| Wet-lab validation | Not included | This platform is computational only               |

---

## Scientific Boundary

All scores are computational predictions.

None of the generated candidates, scores, rankings, or shortlist results should be treated as experimentally validated conclusions.

* `amp_score` is a computational AMP discriminator prediction.
* `mic_saureus` is a computational MIC regressor prediction.
* `mic_ecoli` is currently `null`.
* `toxicity_risk` is currently `null`.
* `hemolysis_risk` is currently `null`.
* `shortlist`, `representative`, `similarity`, and `motif` results only represent computational screening.
* All candidate peptides require independent wet-lab validation before biological, clinical, or commercial conclusions are made.

Do not forge MIC values, toxicity results, hemolysis results, or wet-lab conclusions.

---

## Quick Start

### Backend

```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 18601
```

### Frontend

```powershell
cd app
npm install
npm run dev
```

Default local access:

```text
Frontend: http://127.0.0.1:18600
Backend:  http://127.0.0.1:18601
```

---

## Server Deployment

The platform can be deployed on a Linux GPU server.

Default ports:

| Component | Port  |
| --------- | ----- |
| Backend   | 18601 |
| Frontend  | 18600 |

Real server addresses, usernames, credentials, private paths, model weights, runtime artifacts, and private datasets are not included in this repository.

---

## Technology Stack

* **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide React
* **Backend**: Python web backend, SQLAlchemy, SQLite, Uvicorn
* **Generation Engine**: AMPGen-based peptide generation workflow
* **Scoring**: XGBoost-based AMP and MIC prediction modules
* **Testing**: pytest, TestClient

---

## Project Structure

```text
.
├── app/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── ...
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── runners/
│   │   ├── scorers/
│   │   ├── models/
│   │   └── services/
│   ├── tests/
│   └── requirements.txt
├── scripts/
├── docs/
│   ├── V070_RELEASE_NOTES.md
│   ├── USER_GUIDE_CANDIDATE_REVIEW.md
│   ├── SCIENCE_BOUNDARY.md
│   ├── RUNTIME_CONFIG_AND_COMPUTE_BOUNDARY.md
│   ├── DEPLOYMENT.md
│   ├── ARTIFACTS_AND_REPORTS.md
│   ├── VERSION_TAGS.md
│   ├── LOCAL_AGENT_INTEGRATION_PLAN.md
│   └── RUNBOOK.md
├── README.md
└── .env.example
```

---

## What Should Not Be Committed

Do not commit:

* Real `.env` files
* Passwords, tokens, keys, or credentials
* SQLite databases
* Runtime reports
* Runtime artifacts
* Server artifacts
* Model weight files
* Private datasets
* Local virtual environments
* `node_modules`
* Build output directories
* Obsidian vault files
* Private server paths
* Real server addresses
* Personal account information

Only platform source code, public-safe documentation, and example configuration templates belong in this repository.

---

## Repository Purpose

This repository is intended for:

* Research platform development
* Computational peptide generation workflow visualization
* Candidate ranking and review
* Documentation of computational boundaries
* Internal scientific software engineering

This repository is not intended to provide:

* Experimental validation
* Clinical decision support
* Commercial peptide claims
* Private model weights
* Private datasets
* Private deployment credentials

---

## License

Internal research use.

Experimental data, computational predictions, and candidate rankings must not be used as the sole basis for clinical, commercial, or biological conclusions without independent wet-lab validation.

---

Current version: `v0.6.9-candidate-review`
Next milestone: `v0.7.0-release-ready`
