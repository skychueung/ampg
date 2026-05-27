# AMPGen Agent Platform — Version Matrix

## Current Release

**v0.5.8-candidate-review-workbench**

Release Date: 2026-05-26
Git Tag: `v0.5.8-candidate-review-workbench`

Previous: v0.5.7-sequence-explorer (2026-05-26, e7aa25b)

## v0.5.8 Highlights

- **Candidate Review Workbench** (`/candidate-review`): End-to-end peptide candidate review, shortlisting, and synthesis planning.
  - Summary cards: total candidates, unreviewed, shortlisted, selected for synthesis, high priority, rejected
  - Filter panel: status, source, review_status, priority, selected_for_synthesis, length/charge/hydrophobic fraction ranges
  - Evidence cards: per-candidate rule-based evidence (length, charge, hydrophobic, valid AA) with pass/fail badges
  - Rule-based recommendation: SHORTLIST_CANDIDATE / REVIEW / LOW_PRIORITY with reasons
  - Single review actions: Shortlist, Reject, High Priority, Select for Synthesis
  - Batch review: multi-select + batch actions
  - Shortlist panel: export CSV, FASTA, synthesis order template
  - Synthesis order CSV: Order_ID, Peptide_Name, Sequence, Purity, Scale, Modifications, Salt_Form, Remarks
- **Candidate Review API** (6 endpoints under `/api/v1/candidate-review`):
  - `GET /candidates` — filtered candidate list with review fields
  - `GET /candidates/{id}/evidence` — rule-based evidence card
  - `POST /candidates/{id}/review` — single candidate review update
  - `POST /batch-review` — batch review update
  - `GET /shortlist` — shortlisted / selected-for-synthesis candidates
  - `GET /summary` — review summary statistics
  - `POST /export-shortlist.csv` — CSV export
  - `POST /export-shortlist.fasta` — FASTA export
  - `POST /export-synthesis-order.csv` — synthesis order template export
- **Database**: Added `priority`, `selected_for_synthesis`, `batch_label`, `review_status`, `review_notes`, `reviewed_at` to `peptide_candidates`.
- **Cross-page navigation**: CandidateLibrary, PeptideAnalytics, SequenceExplorer, RunComparison, GenerationRunDetail all link to Review Workbench.
- **Scientific boundary maintained**: Evidence cards labeled as "rule-based review only." Synthesis order remarks: "Computational candidate; not experimentally validated."

## v0.5.7 Highlights

- **Peptide Sequence Explorer** (`/sequence-explorer`): Deep sequence-level analysis of generated peptides.
  - Overview cards: total/unique sequences, duplicate groups, avg/min/max length, source counts
  - Duplicate Groups: exact sequence duplicates with source/status breakdown
  - Similarity Explorer: normalized Levenshtein similarity pairs with adjustable threshold (0.0–1.0) and limit
  - Descriptive Motif Statistics: N-terminal / C-terminal position frequencies, top dipeptides, top amino acids
  - Rule-Based Representatives: greedy selection by physicochemical quality + sequence diversity
- **Sequence Explorer API** (5 endpoints under `/api/v1/sequence-explorer`):
  - `GET /overview` — aggregate sequence statistics
  - `GET /duplicates` — exact duplicate sequence groups
  - `GET /similarity` — normalized Levenshtein similarity pairs (threshold, limit)
  - `GET /motif-enrichment` — descriptive N/C-terminal, dipeptide, AA frequencies
  - `GET /representatives` — rule-based representative peptide selection
- **Cross-page navigation**: CandidateLibrary, PeptideAnalytics, RunComparison, AMPGenWorkflow all link to Sequence Explorer.
- **Scientific boundary maintained**: Similarity explicitly labeled as "descriptive only, not functional equivalence." Motif statistics labeled as "descriptive only, not functional validation." Representatives labeled as "rule-based only, not a model prediction."

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
| v0.5.7 | Peptide Sequence Explorer (duplicates, similarity, motif, representatives) | ✅ |
| v0.5.8 | Candidate Review Workbench (evidence cards, shortlist, batch review, synthesis export) | ✅ |

## Upcoming (Not in v0.5.5)

| Capability | Target |
|-----------|--------|
| Server production backend | BLOCKED |
| XGBoost AMP discriminator | BLOCKED |
| MIC scorer integration | BLOCKED |
| WebSocket real-time push | BLOCKED |
| Full ARIS multi-agent backend | BLOCKED |
