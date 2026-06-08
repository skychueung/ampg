# Version Tags

> **Git tag chain from v0.6.0 to v0.6.9**

---

## Tag Registry

| Tag | Core Meaning | Commit | Status |
|---|---|---|---|
| `v0.6.0-local-mvp-seal` | Local MVP seal — 96/96 pytest pass, 14 smoke scripts pass | — | ✅ GO |
| `v0.6.1-server-gpu-smoke-config` | Server GPU smoke config sync — `AMPGEN_LOCAL_REAL_SMOKE_DEVICE` configurable | — | ✅ GO |
| `v0.6.2-server-production-runner` | SERVER_PRODUCTION runner — real AMPGen call on stamp218 `cuda:1`, count=3 pass | `8cd9e08` | ✅ GO |
| `v0.6.3-server-production-ui-status` | UI status + runtime-config API — source badge, count guard, amber badge | `4cc6023` | ✅ GO |
| `v0.6.4-server-batch-queue` | Batch Queue MVP — chunked generation, total_count=12 pass, 51 blocked | `36fad68` | ✅ GO |
| `v0.6.5-gpu-runner-fix` | GPU runner fix — remove invalid `LD_LIBRARY_PATH`, restore CUDA 12 deps | `783c6bd` | ✅ GO |
| `v0.6.6-backend-deadlock-fix` | Backend deadlock fix — `start_new_session=True` + 600s timeout | `650b380` | ✅ GO |
| `v0.6.7-p6e-discriminator` | P6E XGBoost AMP discriminator — amp_score auto-filled, Acc=0.9640 | `88598a8` | ✅ GO |
| `v0.6.8-p6f-saureus-mic` | P6F S. aureus MIC baseline regressor — mic_saureus auto-filled, R²=0.8464 | `2ebd2b0` | ✅ GO |
| `v0.6.9-candidate-review` | Candidate Review visualization — 10 shortlist types, sort/filter/CSV, boundary banner | `b54110d` | ✅ GO |

---

## Tag Verification Commands

```bash
# List all v0.6.x tags
git tag --list "v0.6.*"

# Verify remote tags
git ls-remote --tags origin | grep "v0.6."

# Show tag details
git show v0.6.9-candidate-review --quiet

# Verify tag chain completeness
for tag in v0.6.0-local-mvp-seal v0.6.1-server-gpu-smoke-config v0.6.2-server-production-runner v0.6.3-server-production-ui-status v0.6.4-server-batch-queue v0.6.5-gpu-runner-fix v0.6.6-backend-deadlock-fix v0.6.7-p6e-discriminator v0.6.8-p6f-saureus-mic v0.6.9-candidate-review; do
  git show $tag --quiet 2>/dev/null && echo "$tag: OK" || echo "$tag: MISSING"
done
```

---

## Next Tag

| Tag | Target Commit | Prerequisites |
|---|---|---|
| `v0.7.0-release-ready` | TBD (current `b54110d` + docs updates) | README updated, docs complete, disclaimer text documented |

**Do not create v0.7.0 tag until all A-class documentation gaps are closed.**

---

*Last updated: 2026-06-08 (v0.6.9-candidate-review)*
