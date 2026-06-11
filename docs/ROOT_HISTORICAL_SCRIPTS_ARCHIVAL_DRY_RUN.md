# AMPGen Root Historical Scripts Archival Dry Run

Date: 2026-06-11
Scope: `/home/xh/kxc/ampg可视化/服务器版`
Status: dry-run planning only

## Boundary

This document records a dry-run archival plan for tracked root historical
scripts. In this task:

- no `git mv`
- no `mv`
- no `rm`
- no script execution
- no real compute
- no batch submission
- no `SERVER_PRODUCTION`, `LOCAL_DEMO`, or `LOCAL_REAL_SMOKE`
- no movement of `.bak` files
- no movement of `server-artifacts/`, `backend/data/`, `reports/`,
  `scorer-models/`, `p6e_*`, or `p6f_*_work`
- no edits to AMPGen original model directory
- no STAMP edits
- no GitHub push

Any real migration must be separately authorized and must start from a clean
working tree.

## Current State

- Current commit at review time: `a23c4d0`
- Working tree at review time: clean
- Service status: `18700/18701`, `18600/18601`, `8001/8080` all remained up
- This review used header inspection and reference search only; none of the
  root scripts were executed

## Root Historical Scripts

| Script | Tracked | Size | Modified | Initial category |
| --- | --- | --- | --- | --- |
| `analyze_fresh_features.py` | yes | 1714 B | 2026-06-02 19:19 | analysis |
| `analyze_training_cols.py` | yes | 1972 B | 2026-06-02 19:14 | analysis |
| `analyze_training_cols2.py` | yes | 1386 B | 2026-06-02 19:15 | analysis |
| `analyze_training_order.py` | yes | 3433 B | 2026-06-02 19:48 | analysis |
| `check_t8_names.py` | yes | 1056 B | 2026-06-02 19:42 | check |
| `check_t8_suffixes.py` | yes | 2115 B | 2026-06-02 19:43 | check |
| `check_t8_suffixes2.py` | yes | 1707 B | 2026-06-02 19:45 | check |
| `test_correct_input.py` | yes | 1689 B | 2026-06-02 19:33 | test |
| `test_full_feature_fix.py` | yes | 3240 B | 2026-06-02 19:39 | test |
| `test_full_features.py` | yes | 3052 B | 2026-06-02 19:30 | test |
| `test_qsorder_fix.py` | yes | 1843 B | 2026-06-02 19:37 | test |
| `test_qsorder_variants.py` | yes | 785 B | 2026-06-02 19:21 | test |

## Usage Assessment

All 12 scripts appear to be historical P6E / PseKRAAC feature-debug utilities:

- `analyze_*`: feature schema inspection, column counting, training-order
  analysis
- `check_*`: T8 naming and suffix verification
- `test_*`: local historical validation scripts for feature extraction and
  QSOrder behavior

Common characteristics:

- many scripts read `reports/p6e/p6e_training_feature_schema_20260602.json`
- several scripts import from
  `p6e_discriminator_export_work/AMP_discriminator_readonly_copy/Discriminator_model`
- several scripts read AMPGen original training data under
  `/home/xh/kxc/ampgenkxc/AMPGen/data/Discriminator_training_data/`
- several scripts write temporary files under `/tmp/`

These characteristics make them good candidates for archival relocation, but
also mean migration must respect path assumptions.

## Reference Search Result

A repository-wide text search for each root script name across tracked content
outside `.git`, `node_modules`, `dist`, `server-artifacts`, and virtualenv
folders produced no direct references.

Conclusion:

- no current evidence that production frontend/backend code imports these files
- no current evidence that docs or helper scripts explicitly depend on their
  root location
- migration is not blocked by an observed production-code reference

Residual caution:

- absence of direct references does not prove zero operational dependence
- path-sensitive historical usage is still possible from shell history or
  ad hoc operator habits

## Dry-Run Migration Table

| Source | Suggested destination | Classification | Migrate? | Risk | Needs approval |
| --- | --- | --- | --- | --- | --- |
| `analyze_fresh_features.py` | `tools/analysis/legacy/analyze_fresh_features.py` | P6E historical analysis | yes | medium | yes |
| `analyze_training_cols.py` | `tools/analysis/legacy/analyze_training_cols.py` | training schema analysis | yes | medium | yes |
| `analyze_training_cols2.py` | `tools/analysis/legacy/analyze_training_cols2.py` | training schema analysis | yes | medium | yes |
| `analyze_training_order.py` | `tools/analysis/legacy/analyze_training_order.py` | training schema analysis | yes | medium | yes |
| `check_t8_names.py` | `tools/ops/checks/check_t8_names.py` | T8 naming check | yes | medium | yes |
| `check_t8_suffixes.py` | `tools/ops/checks/check_t8_suffixes.py` | T8 suffix check | yes | medium | yes |
| `check_t8_suffixes2.py` | `tools/ops/checks/check_t8_suffixes2.py` | T8 suffix check | yes | medium | yes |
| `test_correct_input.py` | `tools/tests/legacy/test_correct_input.py` | historical feature test | yes | high | yes |
| `test_full_feature_fix.py` | `tools/tests/legacy/test_full_feature_fix.py` | historical feature test | yes | high | yes |
| `test_full_features.py` | `tools/tests/legacy/test_full_features.py` | historical feature test | yes | high | yes |
| `test_qsorder_fix.py` | `tools/tests/legacy/test_qsorder_fix.py` | QSOrder historical test | yes | high | yes |
| `test_qsorder_variants.py` | `tools/tests/legacy/test_qsorder_variants.py` | QSOrder historical test | yes | high | yes |

Risk notes:

- `analyze_*` and `check_*` are medium risk because they mostly inspect schema
  and local copied scorer code, but still assume relative paths
- `test_*` are high risk because they read original AMPGen training data and
  write temporary files, so they need a more careful post-move validation pass

## Dry-Run Commands

Do not execute the following commands in this task.

```bash
# DRY-RUN ONLY. DO NOT EXECUTE IN THIS TASK.
# mkdir -p tools/analysis/legacy tools/ops/checks tools/tests/legacy
# git mv analyze_fresh_features.py tools/analysis/legacy/analyze_fresh_features.py
# git mv analyze_training_cols.py tools/analysis/legacy/analyze_training_cols.py
# git mv analyze_training_cols2.py tools/analysis/legacy/analyze_training_cols2.py
# git mv analyze_training_order.py tools/analysis/legacy/analyze_training_order.py
# git mv check_t8_names.py tools/ops/checks/check_t8_names.py
# git mv check_t8_suffixes.py tools/ops/checks/check_t8_suffixes.py
# git mv check_t8_suffixes2.py tools/ops/checks/check_t8_suffixes2.py
# git mv test_correct_input.py tools/tests/legacy/test_correct_input.py
# git mv test_full_feature_fix.py tools/tests/legacy/test_full_feature_fix.py
# git mv test_full_features.py tools/tests/legacy/test_full_features.py
# git mv test_qsorder_fix.py tools/tests/legacy/test_qsorder_fix.py
# git mv test_qsorder_variants.py tools/tests/legacy/test_qsorder_variants.py
```

## Real Migration Preconditions

Before any real migration:

1. confirm `git status --short` is empty
2. confirm no new references were introduced after this review
3. obtain explicit user authorization for the move
4. move files with `git mv`, not plain `mv`
5. run post-move validation

Recommended post-move validation for that future task:

- frontend build
- backend smoke or import sanity checks if any helper path changes are added
- targeted grep for old root paths
- `git diff --check`

## This Task Did Not

- move any root script
- delete any root script
- rename any root script
- run any root script
- run any scorer or generator
- move any `.bak` file
- move any artifacts, databases, model weights, or reports
- modify AMPGen original model directory
- modify STAMP

## Next Step

If the user authorizes a real migration later, the next task can execute the
planned `git mv` operations in a clean tree and verify the repository after the
move. If the user prefers a more conservative path, the next task can first
decide whether `check_*` should stay under `tools/analysis/legacy/` rather than
`tools/ops/checks/`.
