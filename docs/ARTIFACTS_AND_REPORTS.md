# Artifacts and Reports

> **What stays on the server, what goes into Git, and what the reports contain.**

---

## What Does NOT Go Into GitHub

The following must **never** be committed to the GitHub repository:

| Category | Examples | Reason |
|---|---|---|
| **Server artifacts** | `server-artifacts/`, `artifacts/` | Large generated files; server-specific paths |
| **Reports** | `reports/`, `*.audit.json`, `*.audit.csv` | Generated per-run; not source code |
| **Model files** | `*.pt`, `*.pth`, `*.ckpt`, `*.safetensors`, `*.bin`, `*.joblib` | Large binary model weights; server-side only |
| **Model directories** | `scorer-models/`, `p6e_xgboost_amp_discriminator/`, `p6f_mic_saureus_regressor/` | Server-side assets |
| **Virtual environments** | `venv/`, `.venv/`, `.venv-p6e-scorer/`, `.venv-p6f-mic/` | Environment-specific; rebuildable from requirements |
| **Node modules** | `node_modules/` | Rebuildable from package.json |
| **Build output** | `dist/` (except committed for server preview), `build/` | Rebuildable from source |
| **Databases** | `*.db`, `ampgen.db`, `test.db` | Runtime data; may contain sensitive info |
| **Environment files** | `.env`, `.env.local`, `.env.server` | Credentials and secrets |
| **Obsidian vault** | `XH-Research-Agent-Vault/` | Local memory; separate from platform code |
| **Tokens / passwords / keys** | Any file containing API keys, SSH keys, tokens | Security |

**Allowed exceptions**:
- `.env.example` — template without real values
- `.env.server.example` — server config template without real values

---

## What DOES Go Into GitHub

| Category | Examples |
|---|---|
| **Platform source code** | `backend/app/`, `app/src/`, `scripts/` |
| **Documentation** | `README.md`, `docs/*.md` |
| **Tests** | `backend/tests/`, `*.test.ts` |
| **Configuration templates** | `.env.example`, `.env.server.example` |
| **Requirements** | `backend/requirements.txt`, `app/package.json` |
| **GitHub Actions** | `.github/workflows/` (if any) |

---

## Common Report Types

Reports generated during AMPGen operations include:

| Type | Format | Location | Content |
|---|---|---|---|
| **Audit JSON** | `.json` | `reports/` | Run metadata, counts, validation results |
| **Sequences CSV** | `.csv` | `reports/` | Generated peptide sequences with scores |
| **Manifest MD** | `.md` | `reports/` | Human-readable run summary |
| **Shortlist CSV** | `.csv` | `reports/p6e/shortlist_*/`, `reports/p6f/combined_shortlist_*/` | Filtered candidate lists |
| **Motif stats JSON** | `.json` | `reports/p6e/shortlist_*/` | Descriptive motif statistics |
| **KimiCode report** | `.md` | `06_任务单/KimiCode/` (Obsidian) | Task execution reports |
| **Obsidian memory update** | `.md` | `本地记忆/AMPGen可视化平台/` (Obsidian) | Project memory updates |

---

## Artifact Directory Structure

Server artifacts (`/mnt/sdb/ampg可视化/server-artifacts/`) follow this naming:

```
run_{run_id}_{YYYYMMDD}_{HHMMSS}/
├── generated_sequences.csv
├── generated_sequences.fasta
├── stdout.log
└── stderr.log
```

Batch Queue chunks:

```
run_{run_id}_{YYYYMMDD}_{HHMMSS}/  (chunk 1)
run_{run_id+1}_{YYYYMMDD}_{HHMMSS}/  (chunk 2)
...
```

---

## Report Retention

| Report Type | Retention | Action |
|---|---|---|
| Audit JSON / CSV | Permanent | Keep for reproducibility |
| Manifest MD | Permanent | Keep for human reference |
| Shortlist CSV | Permanent | Keep for candidate tracking |
| Server artifacts | Permanent | Keep for sequence provenance |
| Local test databases | Ephemeral | Can delete after test pass |
| Local build `dist/` | Ephemeral | Rebuild on demand |

---

*Last updated: 2026-06-08 (v0.6.9-candidate-review)*
