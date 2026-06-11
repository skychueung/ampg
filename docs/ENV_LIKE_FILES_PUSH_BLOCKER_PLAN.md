## Execution Result｜Env-Like Files Git-Tracking Cleanup｜2026-06-11

本轮已执行 Git tracking cleanup。

执行边界：
- 未删除物理 env 文件
- 未输出真实 secret
- 未修改真实 env value
- 未运行真实计算
- 未提交 batch
- 未修改 app/backend 业务逻辑
- 未修改 AMPGen 原始模型目录
- 未修改 STAMP
- 未 push GitHub
- 未创建 tag

执行内容：
- git rm --cached app/.env.production
- git rm --cached backend/.env.bak.1000test
- git rm --cached backend/.env.bak.100_100
- git rm --cached backend/.env.bak.300_300_20260608_203643
- added app/.env.production.example
- updated .gitignore for app/.env.production and backend/.env.bak*

物理文件状态：
- app/.env.production: retained locally
- backend/.env.bak.*: retained locally

Push readiness:
- env-like tracking blocker resolved
- remote/upstream blocker still requires separate configuration/confirmation
- push readiness must be rerun before any GitHub push

---

# AMPGen Tracked Env-Like Files Push Blocker Plan

Date: 2026-06-11
Scope: `/home/xh/kxc/ampg可视化/服务器版`
Task: `AMPGen Tracked Env-Like Files Safety Classification and Push Blocker Resolution Gate`

## Boundary

This task is a redacted classification and planning pass only.

- no real compute
- no batch submission
- no `SERVER_PRODUCTION`
- no `LOCAL_DEMO`
- no `LOCAL_REAL_SMOKE`
- no `.env` or `.bak` physical file deletion
- no `git rm --cached` in this task
- no modification of real env values
- no app/backend business logic changes
- no AMPGen original model directory changes
- no STAMP changes
- no GitHub push
- no tag creation or tag push

## Current Git State

- Working tree at audit time: clean
- Latest commit at audit time: `8300024 chore: archive root historical scripts`
- Push readiness status after this task: still `BLOCKED`

## Tracked Env-Like Files

| File | Tracked | Lines | Size (bytes) | SHA256 |
| --- | --- | ---: | ---: | --- |
| `app/.env.example` | yes | 1 | 45 | `7311b5db66447bbc745c7782e60854ee3c3e0f6a23a77035d0cc9fdd8a06733c` |
| `app/.env.production` | yes | 1 | 50 | `ba3beead3da2ef93846a055f0506f26f56eb84155619f98dcf55a401735d9fd2` |
| `backend/.env.bak.1000test` | yes | 16 | 610 | `778da7131034aafb231becfc0a9372a0ade9aede0b1dd592e6f5f6947cd7da1c` |
| `backend/.env.bak.100_100` | yes | 16 | 610 | `778da7131034aafb231becfc0a9372a0ade9aede0b1dd592e6f5f6947cd7da1c` |
| `backend/.env.bak.300_300_20260608_203643` | yes | 16 | 610 | `778da7131034aafb231becfc0a9372a0ade9aede0b1dd592e6f5f6947cd7da1c` |
| `backend/.env.example` | yes | 13 | 589 | `6fd77017b5d327d9a19f621180b1ead82036ec6d03a17a0358bc70904e39ecfd` |

## Keys Only

### `app/.env.example`

`VITE_API_BASE_URL=<REDACTED>`

### `app/.env.production`

`VITE_API_BASE_URL=<REDACTED>`

### `backend/.env.bak.*`

`AMPGEN_ROOT=<REDACTED>`
`AMPGEN_VISUALIZATION_ROOT=<REDACTED>`
`AMPGEN_LOCAL_REAL_SMOKE_DEVICE=<REDACTED>`
`DATABASE_URL=<REDACTED>`
`ARTIFACT_DIR=<REDACTED>`
`LOCAL_REAL_SMOKE_MAX_COUNT=<REDACTED>`
`LOCAL_DEMO_MAX_COUNT=<REDACTED>`
`SERVER_PRODUCTION_ENABLED=<REDACTED>`
`SERVER_PRODUCTION_MAX_COUNT=<REDACTED>`
`AMPGEN_SERVER_PRODUCTION_DEVICE=<REDACTED>`
`SERVER_ARTIFACT_DIR=<REDACTED>`
`SERVER_BATCH_ENABLED=<REDACTED>`
`SERVER_BATCH_MAX_TOTAL_COUNT=<REDACTED>`
`SERVER_BATCH_CHUNK_SIZE=<REDACTED>`
`SERVER_BATCH_MAX_CONCURRENCY=<REDACTED>`
`AMPGEN_PYTHON_EXECUTABLE=<REDACTED>`

### `backend/.env.example`

`AMPGEN_ROOT=<REDACTED>`
`AMPGEN_VISUALIZATION_ROOT=<REDACTED>`
`DATABASE_URL=<REDACTED>`
`ARTIFACT_DIR=<REDACTED>`
`LOCAL_REAL_SMOKE_MAX_COUNT=<REDACTED>`
`LOCAL_DEMO_MAX_COUNT=<REDACTED>`
`SERVER_PRODUCTION_ENABLED=<REDACTED>`
`SERVER_PRODUCTION_MAX_COUNT=<REDACTED>`
`SERVER_ARTIFACT_DIR=<REDACTED>`
`SERVER_BATCH_ENABLED=<REDACTED>`
`AMPGEN_SERVER_ONLY=<REDACTED>`
`AMPGEN_BACKEND_PORT=<REDACTED>`
`SERVER_PRODUCTION_SINGLE_RUN_LIMIT=<REDACTED>`

## Secret Pattern Counts Only

| File | password_like | token_like | key_like | url_like | private_key_like |
| --- | ---: | ---: | ---: | ---: | ---: |
| `app/.env.example` | 0 | 0 | 0 | 1 | 0 |
| `app/.env.production` | 0 | 0 | 0 | 1 | 0 |
| `backend/.env.bak.1000test` | 0 | 0 | 0 | 1 | 0 |
| `backend/.env.bak.100_100` | 0 | 0 | 0 | 1 | 0 |
| `backend/.env.bak.300_300_20260608_203643` | 0 | 0 | 0 | 1 | 0 |
| `backend/.env.example` | 0 | 0 | 0 | 1 | 0 |

## Risk Classification

| File | Classification | Risk | Notes |
| --- | --- | --- | --- |
| `app/.env.example` | public template config | low | single frontend URL key; example file is appropriate to keep tracked |
| `app/.env.production` | environment-specific frontend config | medium | only one public-facing URL key, but real production env naming should not stay tracked |
| `backend/.env.bak.*` | historical backup env files | high | includes database/artifact/runtime keys; three files share the same hash and should not remain tracked |
| `backend/.env.example` | backend example template | medium | template naming is correct, but it currently exposes operational key names including `DATABASE_URL`; acceptable only as a redacted example |

## Ignore Coverage Findings

- Root `.gitignore` ignores `.env`, but does not currently ignore `.env.production`.
- Root `.gitignore` does not currently ignore `.env.bak*`.
- Root `.gitignore` ignores `backend/data/*.db` and `backend/data/artifacts/`, but not the full `backend/data/` tree.
- Root `.gitignore` ignores `node_modules/`; probe path checks confirm the pattern works for nested content.
- `app/.gitignore` ignores `node_modules` and `dist`.

## Example File Findings

- Present: `app/.env.example`
- Present: `backend/.env.example`
- Missing: `app/.env.production.example`
- Missing: dedicated backup-env example is not needed

## Recommended Resolution Plan

### Plan A: Frontend env template normalization

- Keep `app/.env.example` tracked.
- Replace tracked `app/.env.production` with a template file such as `app/.env.production.example`.
- Keep the real `app/.env.production` on the server only, outside Git tracking.

### Plan B: Remove backup env files from Git tracking

- Treat all `backend/.env.bak.*` files as historical local backups.
- Keep the physical files on the server if they are still operationally useful.
- Remove them from Git tracking in a separate authorized cleanup task.
- Add an ignore rule for `backend/.env.bak*` before or together with tracking cleanup.

### Plan C: Tighten env policy

- Track only `*.example` env templates.
- Do not track real env files or historical env backups.
- Re-run push readiness after env-like cleanup and remote/upstream confirmation.

## Candidate Commands For Next Gate

**DO NOT EXECUTE IN THIS TASK**

```bash
git rm --cached app/.env.production
git rm --cached backend/.env.bak.1000test backend/.env.bak.100_100 backend/.env.bak.300_300_20260608_203643
printf '\napp/.env.production\nbackend/.env.bak*\n' >> .gitignore
cp app/.env.production app/.env.production.example
git add .gitignore app/.env.production.example
git commit -m "chore: stop tracking env-like runtime files"
```

## Status After This Task

- No physical env file was deleted.
- No `git rm --cached` was executed.
- No real env value was modified.
- No token, password, key, or full connection string was printed in this document.
- No GitHub push was performed.
- Push readiness remains `BLOCKED` until tracked env-like files are cleaned up in a separate authorized task and remote/upstream is confirmed.
