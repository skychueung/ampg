# Deployment Guide — stamp218

> **Server**: stamp218 (192.168.31.218)  
> **OS**: Ubuntu Linux  
> **GPU**: 2× RTX 4090, `cuda:1` for AMPGen

---

## Server Host

| Property | Value |
|---|---|
| Hostname | `stamp218` |
| IP Address | `192.168.31.218` |
| SSH Port | `22` |
| Authentication | SSH key (publickey) |

---

## Directory Structure

| Path | Purpose | Writable? |
|---|---|---|
| `/home/xh/kxc/ampg可视化` | AMPGen Visualization Platform main working directory | ✅ Yes |
| `/home/xh/kxc/ampgenkxc/AMPGen` | AMPGen original model / algorithm source | ❌ Read-only |
| `/mnt/sdb/ampg可视化/server-artifacts` | SERVER_PRODUCTION artifact output directory | ✅ Yes |
| `/home/xh/kxc/ampg可视化/reports` | Task reports, audit JSON, CSV, manifest | ✅ Yes |
| `/home/xh/kxc/ampg可视化/logs` | Runtime logs | ✅ Yes |
| `/home/xh/kxc/ampg可视化/data` | Platform runtime data | ✅ Yes |
| `/home/xh/kxc/ampg可视化/scripts` | Startup, deployment, check scripts | ✅ Yes |

---

## Model Directories

| Model | Path |
|---|---|
| P6E XGBoost AMP discriminator | `/mnt/sdb/ampg可视化/scorer-models/p6e_xgboost_amp_discriminator/` |
| P6F S. aureus MIC regressor | `/mnt/sdb/ampg可视化/scorer-models/p6f_mic_saureus_regressor/` |

**Model files do NOT enter Git.** They are server-side assets only.

---

## Port Configuration

| Service | Backend Port | Frontend Port | Process |
|---|---|---|---|
| AMPGen | `18601` | `18600` | python3 uvicorn / node vite preview |
| STAMP | `8001` | `8080` | python3 uvicorn / node |

**Current status** (last verified 2026-06-08):
- AMPGen backend 18601: ✅ listening
- AMPGen frontend 18600: ✅ listening
- STAMP backend 8001: ✅ listening (must not be modified)
- STAMP frontend 8080: ✅ listening (must not be modified)

---

## STAMP Protection

**STAMP is a separate platform. Do not modify it.**

- Do **not** stop STAMP services.
- Do **not** change STAMP ports.
- Do **not** deploy AMPGen files into STAMP directories.
- Do **not** mix STAMP and AMPGen databases.

---

## Deployment Checklist

When deploying new AMPGen code to stamp218:

1. ✅ Verify SSH connectivity: `ssh xh@192.168.31.218`
2. ✅ Navigate to `/home/xh/kxc/ampg可视化`
3. ✅ Pull latest code: `git pull origin master`
4. ✅ Verify backend dependencies: `pip install -r backend/requirements.txt`
5. ✅ Verify frontend build: `cd app && npm install && npm run build`
6. ✅ Restart backend: `cd backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 18601`
7. ✅ Restart frontend: `cd app && npm run preview -- --host 0.0.0.0 --port 18600`
8. ✅ Verify runtime-config API: `curl http://192.168.31.218:18601/api/v1/system/runtime-config`
9. ✅ Verify Candidate Review API: `curl "http://192.168.31.218:18601/api/v1/candidate-review/p6f-shortlist?type=combined_top20"`
10. ✅ Verify STAMP 8001/8080 still responding

---

## Backup Directory

Before major deployments, a backup is created at:

```
/home/xh/kxc/ampg可视化/backups/
```

Format: `candidate_review_YYYYMMDD_HHMMSS/` or similar timestamp.

---

*Last updated: 2026-06-08 (v0.6.9-candidate-review)*
