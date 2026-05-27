# AMPGen Agent Platform Changelog

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
  - `GET /api/v1/analytics/peptides-summary` — aggregated peptide statistics
  - `GET /api/v1/analytics/property-distributions` — length/charge/hydrophobicity histogram bins
  - `GET /api/v1/analytics/amino-acid-composition` — 20 standard amino acid frequencies
  - `GET /api/v1/analytics/status-source-breakdown` — status/source/backend counts
  - `GET /api/v1/analytics/filter-rule-pass-rate` — 4 physicochemical filter rules with pass/fail rates
  - `GET /api/v1/analytics/top-candidates?limit=N` — rule-based heuristic ranking (not model prediction)
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
