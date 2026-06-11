# AMPGen Structure Cleanup Plan

Date: 2026-06-11
Scope: AMPGen visual platform server edition at `/home/xh/kxc/ampg可视化/服务器版`
Status: planning gate only

## Boundary

This document is a structure-governance plan. It does not authorize real
calculation, batch submission, service restart, artifact movement, database
movement, model-weight movement, historical deletion, STAMP edits, or GitHub
push.

Protected runtime surfaces:

- Standard Demo services: `18700`, `18701`
- Server-Only UI services: `18600`, `18601`
- STAMP adjacent services: `8001`, `8080`

Protected data and runtime directories:

- `server-artifacts/`
- `backend/data/`
- `backend/data/artifacts/`
- `scorer-models/`
- `.venv*`
- `reports/`
- `p6e_discriminator_export_work/`
- `p6f_*_work/`
- `env_snapshots/`

## Current Structure Review

The current repository is operational but has mixed layers in the root:

- Product source code: `app/`, `backend/`
- Runtime state and generated assets: `server-artifacts/`, `backend/data/`,
  `reports/`
- Scorer/export workspaces: `p6e_discriminator_export_work/`,
  `p6f_*_work/`
- One-off analysis and verification scripts in root:
  `analyze_*`, `check_*`, `test_*`
- Deployment and operation scripts under `scripts/`
- Documentation under `docs/`

The root-level mix makes it harder to distinguish product code, runtime state,
historical experiments, and one-off diagnostics. The immediate risk is not
functional failure, but governance drift: accidental commits, accidental
cleanup of runtime assets, and unclear ownership of scripts.

## Fastest Safe Fixes

These fixes are low-risk and can be done without service changes:

1. Limit virtualenv ignore rules to repository root.
   - Change `lib/` to `/lib/`
   - Change `lib64/` to `/lib64/`
   - Reason: broad `lib/` ignores `app/src/lib/`, which is source code.
2. Keep all runtime/generated paths ignored.
   - Preserve ignore coverage for artifacts, databases, reports, model weights,
     workspaces, virtualenvs, caches, and logs.
3. Record cleanup policy in `docs/` before moving any file.

## Classification

| Area | Examples | Current action | Future action |
| --- | --- | --- | --- |
| Frontend source | `app/`, `app/src/`, `app/src/lib/` | Keep tracked | Protect through `.gitignore` correction |
| Backend source | `backend/app/`, `backend/tests/` | Keep tracked | Keep under backend ownership |
| Documentation | `docs/` | Keep tracked | Expand governance docs |
| Runtime artifacts | `server-artifacts/`, `backend/data/artifacts/` | Do not move | Design archive/export policy later |
| Databases | `*.db`, `*.sqlite`, `backend/data/` | Do not move | Back up before any future migration |
| Model weights | `*.pt`, `*.pth`, `*.ckpt`, `*.safetensors`, `scorer-models/` | Do not move | Keep external to Git |
| Reports | `reports/` | Do not move | Decide retention and publication boundary |
| Export/scorer work dirs | `p6e_*_work/`, `p6f_*_work/` | Do not move | Review after scorer ownership is mapped |
| Root diagnostics | `analyze_*`, `check_*`, `test_*` | Do not delete | Move only after dependency check |
| Scripts | `scripts/` | Keep | Split by role if needed |

## Proposed Target Structure

The target can be introduced gradually:

```text
.
├── app/
├── backend/
├── docs/
│   ├── STRUCTURE_CLEANUP_PLAN.md
│   └── DEPLOYMENT_PROFILE_AND_ROUTE_REGISTRY_PLAN.md
├── scripts/
│   ├── ops/
│   ├── smoke/
│   ├── analysis/
│   └── legacy/
├── tools/
│   ├── analysis/
│   └── migration/
└── archive/
    └── code-only/
```

Notes:

- `archive/code-only/` is for source-like historical files only.
- Runtime outputs, databases, model weights, and large artifacts must not be
  moved into archive by default.
- Any future move must be preceded by `git status`, path inventory, dependency
  search, and a reversible commit.

## Step-by-Step Cleanup Path

### Phase 0: Governance Gate

- Fix `.gitignore` source-code misfire.
- Add this structure plan.
- Add deployment profile and route registry plan.
- Commit docs and `.gitignore` only.

### Phase 1: Script Ownership Inventory

- List every root `analyze_*`, `check_*`, and `test_*` file.
- Search references from docs, scripts, backend, frontend, and shell history
  where available.
- Mark each script as one of:
  - active operation
  - active smoke or regression check
  - one-off historical diagnostic
  - unknown, keep in place

### Phase 2: Code-Only Relocation

- Move only confirmed source-like historical diagnostics.
- Suggested destination:
  - `tools/analysis/legacy/`
  - or `scripts/legacy/`
- Do not move runtime data, model outputs, or reports in this phase.

### Phase 3: Runtime Retention Policy

- Define retention rules for reports and artifacts.
- Separate human-readable reports from machine-generated runtime outputs.
- Add backup and checksum rules before any cleanup.

### Phase 4: CI / Smoke Guard

- Add a lightweight smoke command for docs/source-only changes.
- Add route/profile smoke after the route registry exists.
- Keep generation and batch workflows out of automatic cleanup tests.

## Acceptance Criteria

For Phase 0:

- `app/src/lib/*` is no longer ignored by `.gitignore`.
- Runtime/generated/high-risk directories remain ignored.
- Only `.gitignore` and files under `docs/` are modified.
- No services are restarted.
- No artifacts, databases, model weights, reports, or historical files are
  moved or deleted.
- Git status is clean after commit.

For later phases:

- Every moved file has an inventory note.
- Every move is source-only unless explicitly approved.
- No runtime output is moved without backup and checksum.
- Standard Demo and Server-Only UI still pass smoke checks.

## Open Questions

- Which root diagnostics are still used by active scorer verification?
- Should `scripts/` be split by role, or should legacy scripts move under
  `tools/analysis/legacy/`?
- Should reports remain local-only, or should a curated report subset be
  published under docs?
- Should route/profile smoke be a backend endpoint, a frontend unit test, or
  both?
