# AMPGen Agent Platform — Version Matrix

## Current Release

**v0.5.6-run-comparison**

Release Date: 2026-05-26
Git Tag: `v0.5.6-run-comparison`

Previous: v0.5.5-peptide-analytics (2026-05-26, dfb8aed)

## v0.5.6 Highlights

- **Run Comparison** (`/run-comparison`): Side-by-side comparison of 2–4 generation runs.
  - Multi-select run picker with backend/status badges
  - Comparison table: avg length, charge, hydrophobic fraction, candidate/filtered/rejected counts
  - Length distribution grouped bar chart (recharts)
  - Status distribution radar chart
  - Status stacked bar chart
  - Run metadata cards with color coding
- **Run-Level Analytics API** (3 new endpoints under `/api/v1/analytics`):
  - `GET /generation-runs-summary` — lightweight list of all runs
  - `GET /generation-runs/{run_id}/analytics` — per-run stats, AA composition, filter rules
  - `POST /generation-runs/compare` — compare 2–4 runs with aggregated metrics
- **Cross-page navigation**: PeptideAnalytics, AMPGenWorkflow, GenerationRunDetail all link to Run Comparison.
- **Scientific boundary maintained**: Comparison is explicitly labeled as "procedural analysis only, not antimicrobial activity benchmarking".

## v0.5.5 Highlights

- **Peptide Analytics Dashboard** (`/peptide-analytics`): Visual analytics for generated peptide candidates.
  - Summary cards: total peptides, candidates, local demo/real smoke counts, averages
  - Distribution charts: length, net charge, hydrophobic fraction (recharts)
  - Amino acid composition: 20 standard AA bar chart with frequency
  - Status & source breakdown: pie charts + backend counts
  - Filter rule pass rate: 4 physicochemical rules with progress bars
  - Top rule-based candidates: heuristic ranking, NOT model prediction
  - Candidate detail drawer: click any candidate to view full properties
- **Analytics API** (6 endpoints under `/api/v1/analytics`):
  - `GET /peptides-summary` — aggregated statistics
  - `GET /property-distributions` — binned histograms
  - `GET /amino-acid-composition` — 20 AA frequency
  - `GET /status-source-breakdown` — status/source/backend counts
  - `GET /filter-rule-pass-rate` — 4 filter rules with pass/fail counts
  - `GET /top-candidates?limit=N` — rule-based heuristic ranking
- **Cross-page navigation**: CandidateLibrary, AMPGenWorkflow, GenerationRunDetail all link to Peptide Analytics.
- **Scientific boundary maintained**: All scores remain `Not computed`. Rule-based ranking explicitly labeled as heuristic only.

## Capability Matrix

| Version | Capability | Status |
|---------|-----------|--------|
| v0.1 | Frontend demo (mock data) | ✅ |
| v0.2 | Backend + local real smoke (sync blocking) | ✅ |
| v0.3 | Frontend real API integration | ✅ |
| v0.3 | Async task execution (threading.Thread) | ✅ |
| v0.3 | Frontend polling (3s interval) | ✅ |
| v0.4 | Safe task cancellation | ✅ |
| v0.5 | Report Export Center (real API) | ✅ |
| v0.5.1 | Remove fake demo amp_score / MIC values | ✅ |
| v0.5.2 | Dashboard + ReportExport + PeptideDetail real API | ✅ |
| v0.5.3 | Frontend code splitting (1333 KB → 244 KB main bundle) | ✅ |
| v0.5.4 | AMPGen Workflow Visualizer + Run Detail + Artifacts API | ✅ |
| v0.5.5 | Peptide Analytics Dashboard + 6 analytics APIs | ✅ |
| v0.5.6 | Generation Run Comparison + Run-Level Analytics | ✅ |

## Upcoming (Not in v0.5.5)

| Capability | Target |
|-----------|--------|
| Server production backend | BLOCKED |
| XGBoost AMP discriminator | BLOCKED |
| MIC scorer integration | BLOCKED |
| WebSocket real-time push | BLOCKED |
| Full ARIS multi-agent backend | BLOCKED |
