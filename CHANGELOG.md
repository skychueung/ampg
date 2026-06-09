# AMPGen Agent Platform Changelog

## v0.6.0-local-mvp-seal (2026-05-28)

### Seal Validation
- **pytest**: 96/96 passed in 51.39s
- **npm build**: 0 TypeScript errors, built in 12.14s
- **smoke tests**: 14/14 passed
  - healthcheck.ps1 | PASS | 0.17s
  - smoke_dashboard_real_api.ps1 | PASS | 0.23s
  - smoke_scientific_boundary_hotfix.ps1 | PASS | 1.20s
  - smoke_ampgen_visualizer.ps1 | PASS | 2.22s
  - smoke_peptide_analytics.ps1 | PASS | 0.19s
  - smoke_run_comparison.ps1 | PASS | 0.22s
  - smoke_sequence_explorer.ps1 | PASS | 0.36s
  - smoke_local_demo.ps1 | PASS | 2.13s
  - smoke_local_real.ps1 | PASS | 46.09s
  - smoke_cancel_local_real.ps1 | PASS | 5.26s
  - smoke_export_reports.ps1 | PASS | 0.23s
  - smoke_candidate_review.ps1 | PASS | 0.18s
  - smoke_maintenance.ps1 | PASS | 0.65s
  - backup_project_snapshot.ps1 | PASS | 0.23s
- **snapshot**: ackups/snapshots/ampgen_platform_snapshot_20260528_220153.zip (0.09 MB), excludes .env, .git, 
ode_modules, dist, model weights
- **database**: 75 peptide candidates, 50 tasks, 50 generation runs; 0 fake amp_score/MIC
- **scientific boundary**: verified, no violations

### Documentation
- Updated VERSION.md, CHANGELOG.md
- Added docs/LOCAL_MVP_SEAL_v0.6.0.md

### Design Notes
- No new features added; pure validation and seal.
- LOCAL_REAL_SMOKE still does not populate amp_score/MIC.
- Candidate Review does not modify amp_score/MIC.
- All exports preserve null scores as 'N/A'.

## v0.5.9-local-maintenance (2026-05-26)

### Added
- **Local Maintenance** (`/maintenance`): Full local data maintenance workflow
  - Storage Summary cards: database size, artifacts size, backup count, peptide/task/shortlist counts
  - Backup Database: timestamped SQLite backups in `backups/db/`
  - Backup Artifacts: zip export of `backend/data/artifacts/`
  - Project Snapshot: zip with README, docs, scripts, git commit/tag, database copy, artifact zip
  - Restore Database: confirm text required, auto pre-restore backup, blocks on RUNNING/PENDING tasks, path-traversal protected
  - Cleanup Artifacts: default dry-run, age-based, does not touch DB/backups/model files
  - Reset Demo Data: confirm text required, defaults keep LOCAL_REAL_SMOKE and review/shortlist data, auto pre-reset backup
- **Maintenance API** (8 endpoints):
  - `GET /api/v1/maintenance/storage-summary`
  - `POST /api/v1/maintenance/backup-database`
  - `POST /api/v1/maintenance/backup-artifacts`
  - `POST /api/v1/maintenance/create-project-snapshot`
  - `GET /api/v1/maintenance/backups`
  - `POST /api/v1/maintenance/restore-database`
  - `POST /api/v1/maintenance/cleanup-artifacts`
  - `POST /api/v1/maintenance/reset-demo-data`
- **Frontend**: `LocalMaintenancePage.tsx` lazy-loaded, `maintenance.ts` API client, `/maintenance` route, Sidebar entry
- **Scripts**: `scripts/smoke_maintenance.ps1`, `scripts/backup_project_snapshot.ps1`
- **Tests**: 12 pytest cases in `test_maintenance.py`

### Design Notes
- Snapshot excludes `.env`, `.git`, `node_modules`, `dist`, `__pycache__`, `.pytest_cache`, AMPGen model weights.
- Restore and reset require typed confirmation (`RESTORE`, `RESET DEMO`).
- Cleanup defaults to `dry_run=true` to prevent accidental deletion.
- Demo reset defaults preserve real smoke runs and review decisions.

## v0.5.8-candidate-review-workbench (2026-05-26)

### Added
- **Candidate Review Workbench** (`/candidate-review`): Full review workflow for AMPGen peptide candidates
  - Summary cards, filter panel, evidence cards, batch review, shortlist panel
  - Evidence cards: length/charge/hydrophobic/valid-AA rule checks with pass/fail badges
  - Rule-based recommendation: SHORTLIST_CANDIDATE / REVIEW / LOW_PRIORITY
  - Single actions: Shortlist, Reject, High Priority, Select for Synthesis
  - Batch actions: multi-select + batch review
  - Shortlist exports: CSV, FASTA, synthesis order template
- **Candidate Review API** (9 endpoints):
  - `GET /api/v1/candidate-review/candidates` â€?filtered list with review fields
  - `GET /api/v1/candidate-review/candidates/{id}/evidence` â€?evidence card
  - `POST /api/v1/candidate-review/candidates/{id}/review` â€?single review update
  - `POST /api/v1/candidate-review/batch-review` â€?batch review update
  - `GET /api/v1/candidate-review/shortlist` â€?shortlisted candidates
  - `GET /api/v1/candidate-review/summary` â€?review summary statistics
  - `POST /api/v1/candidate-review/export-shortlist.csv` â€?CSV export
  - `POST /api/v1/candidate-review/export-shortlist.fasta` â€?FASTA export
  - `POST /api/v1/candidate-review/export-synthesis-order.csv` â€?synthesis order template
- **Database fields**: `priority`, `selected_for_synthesis`, `batch_label`, `review_status`, `review_notes`, `reviewed_at`
- **Tests**: 10 new pytest cases in `test_candidate_review.py`
- **Smoke test**: `scripts/smoke_candidate_review.ps1`

### Design Notes
- Evidence cards are rule-based only, not model predictions.
- Synthesis order template includes "Computational candidate; not experimentally validated." in Remarks.
- All AMP scores and MIC values continue to display as "Not computed".
- Shortlist does not imply experimental validation.

## v0.5.7-sequence-explorer (2026-05-26)

### Added
- **Peptide Sequence Explorer** (`/sequence-explorer`): Sequence-level exploration page
  - Overview cards: total/unique sequences, duplicate groups, avg/min/max length
  - Duplicate Groups table: exact sequence duplicates with peptide IDs, sources, statuses
  - Similarity Explorer: adjustable threshold/limit, normalized Levenshtein similarity pairs
  - Descriptive Motif Statistics: N-terminal / C-terminal position frequencies, top dipeptides, top amino acids
  - Rule-Based Representatives: greedy selection prioritizing quality + diversity
- **Sequence Explorer API** (5 new endpoints):
  - `GET /api/v1/sequence-explorer/overview` â€?aggregate sequence statistics
  - `GET /api/v1/sequence-explorer/duplicates` â€?exact duplicate sequence groups
  - `GET /api/v1/sequence-explorer/similarity?threshold=0.8&limit=100` â€?Levenshtein similarity pairs
  - `GET /api/v1/sequence-explorer/motif-enrichment` â€?descriptive motif statistics
  - `GET /api/v1/sequence-explorer/representatives?limit=10` â€?rule-based representative selection
- **Cross-page navigation**: CandidateLibrary, PeptideAnalytics, RunComparison, AMPGenWorkflow all link to Sequence Explorer.
- **Tests**: 8 new pytest cases in `test_sequence_explorer.py`
- **Smoke test**: `scripts/smoke_sequence_explorer.ps1`

### Design Notes
- Similarity is explicitly labeled as descriptive only, not functional equivalence.
- Motif statistics are explicitly labeled as descriptive only, not functional validation.
- Representative selection is explicitly labeled as rule-based only, not a model prediction.
- All AMP scores and MIC values continue to display as "Not computed".

## v0.5.6-run-comparison (2026-05-26)

### Added
- **Run Comparison Page** (`/run-comparison`): Side-by-side comparison of 2â€? generation runs
  - Multi-select run picker with backend, status, and count badges
  - Comparison results table: avg length, net charge, hydrophobic fraction, status counts
  - Length distribution grouped bar chart
  - Status distribution radar chart + stacked bar chart
  - Run metadata cards with per-run color coding
- **Run-Level Analytics API** (3 new endpoints):
  - `GET /api/v1/analytics/generation-runs-summary` â€?lightweight list of all generation runs
  - `GET /api/v1/analytics/generation-runs/{run_id}/analytics` â€?per-run analytics (stats, AA composition, filter rules)
  - `POST /api/v1/analytics/generation-runs/compare` â€?compare 2â€? runs (enforces min 2, max 4)
- **Cross-page navigation**: PeptideAnalytics, AMPGenWorkflow, GenerationRunDetail all link to Run Comparison.
- **Tests**: 7 new pytest cases in `test_analytics_run_comparison.py`
- **Smoke test**: `scripts/smoke_run_comparison.ps1`

### Design Notes
- Comparison explicitly labeled as procedural analysis only, not antimicrobial activity benchmarking.
- All AMP scores and MIC values continue to display as "Not computed".

## v0.5.5-peptide-analytics (2026-05-26)

### Added
- **Peptide Analytics Dashboard** (`/peptide-analytics`): New page with visual analytics:
  - Summary cards: total peptides, candidates, local demo/real smoke, averages
  - Distribution charts: length, net charge, hydrophobic fraction (recharts bar charts)
  - Amino acid composition: 20 standard AA bar chart with count and frequency
  - Status & source breakdown: pie charts for status/source, list for backend
  - Filter rule pass rate: 4 rules (length 15-35, valid AA, net charge >0, hydrophobic 0.40-0.70) with progress bars
  - Top rule-based candidates: heuristic ranking table with rule_based_rank and rule_based_reason
  - Candidate detail drawer: click any row to open side panel with full properties
- **Analytics API** (6 endpoints):
  - `GET /api/v1/analytics/peptides-summary` â€?aggregated peptide statistics
  - `GET /api/v1/analytics/property-distributions` â€?length/charge/hydrophobicity histogram bins
  - `GET /api/v1/analytics/amino-acid-composition` â€?20 standard amino acid frequencies
  - `GET /api/v1/analytics/status-source-breakdown` â€?status/source/backend counts
  - `GET /api/v1/analytics/filter-rule-pass-rate` â€?4 physicochemical filter rules with pass/fail rates
  - `GET /api/v1/analytics/top-candidates?limit=N` â€?rule-based heuristic ranking (not model prediction)
- **Cross-page navigation**: CandidateLibrary, AMPGenWorkflow, GenerationRunDetail all link to Peptide Analytics.

### Design Notes
- Rule-based ranking is explicitly labeled as heuristic only, not a model prediction.
- All AMP scores and MIC values continue to display as "Not computed".
- LOCAL_DEMO and LOCAL_REAL_SMOKE peptides are distinguished in source counts.

## v0.5.4-ampgen-visualizer (2026-05-26)

### Added
- AMPGen Workflow Visualizer page
- Generation Run Detail page
- Artifacts API

## v0.5.3-frontend-code-splitting (2026-05-26)

### Changed
- Route-level React.lazy + Suspense
- Vite manualChunks vendor splitting

## v0.5.2-dashboard-report-preview-fix (2026-05-26)

### Fixed
- Dashboard, ReportExport, PeptideDetail now use real APIs

## v0.5.1-hotfix (2026-05-26)

### Fixed
- Removed fake demo scores

## v0.5-report-export (2026-05-25)

### Added
- Report Export Center

## v0.4-task-cancellation (2026-05-25)

### Added
- Safe task cancellation

## v0.3-local-real-async (2026-05-25)

### Added
- Async backend execution
