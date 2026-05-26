# AMPGen Agent Platform Changelog

## v0.5.4-ampgen-visualizer (2026-05-26)

### Added
- **AMPGen Workflow Visualizer** (`/ampgen-workflow`): New page showing:
  - Three backend mode cards (LOCAL_DEMO, LOCAL_REAL_SMOKE, SERVER_PRODUCTION)
  - 9-step AMPGen workflow timeline with API and page references
  - Real-time system status panel (backend health, AMPGen probe, database stats)
  - Scientific boundary banner
- **Generation Run Detail** (`/generation-runs/:runId`): New page showing:
  - Run summary card (run ID, task ID, backend, mode, count, status, timestamps)
  - Visual timeline (Pending → Running → Artifacts Saved → Peptides Inserted → Terminal state)
  - Task status card with progress and error messages
  - Collapsible logs panel (task logs + stdout/stderr artifact logs)
  - Artifacts grid (stdout.log, stderr.log, generated_sequences.csv, generated_sequences.fasta)
  - Generated peptides table with "Not computed" scores
  - Quick action buttons (Back to Generation, Candidate Library, Task Center, Copy FASTA)
- **Artifacts API** (`GET /api/v1/generation-runs/{run_id}/artifacts`):
  - Lists artifact files with `exists`, `size_kb`, `modified_at`, `type`
  - Path-traversal security check (resolved path must start with ARTIFACT_DIR)
  - Returns 200 with empty `files` when artifact_dir is missing or not yet created
  - Returns 404 only when run_id does not exist
- **Task → Run linkage**: `GET /api/v1/tasks/{id}` now returns `related_generation_run_id`
- **Cross-page navigation**:
  - Generation page shows "View Run Detail" / "View Live Run Detail" / "View Full Run Detail" button
  - TaskCenter shows external-link icon for generation tasks with related run ID
  - CandidateLibrary shows "View Source Run" link for peptides with `generation_run_id`
- **Sidebar**: Added "AMPGen Workflow" navigation entry with Workflow icon

### Design Notes
- LOCAL_DEMO does not produce file artifacts (in-memory generation). Empty `files` array is expected.
- LOCAL_REAL_SMOKE writes stdout.log, stderr.log, generated_sequences.csv, generated_sequences.fasta to `task.artifact_dir`.
- All scores continue to display as "Not computed" for both LOCAL_DEMO and LOCAL_REAL_SMOKE.

## v0.5.3-frontend-code-splitting (2026-05-26)

### Changed
- All major pages now use React.lazy + Suspense for route-level code splitting.
- Vite manualChunks splits vendor libraries into separate chunks.
- Main JS bundle reduced from ~1333 KB to ~244 KB (gzip: 77 KB).

## v0.5.2-dashboard-report-preview-fix (2026-05-26)

### Fixed
- Dashboard, ReportExport, PeptideDetail now use real APIs instead of demoData.

## v0.5.1-hotfix (2026-05-26)

### Fixed
- Removed fake demo scores. LOCAL_DEMO peptides now have `amp_score=null`, `mic_ecoli=null`, `mic_saureus=null`.

## v0.5-report-export (2026-05-25)

### Added
- Report Export Center with CSV, FASTA, JSON, Markdown exports.

## v0.4-task-cancellation (2026-05-25)

### Added
- Safe task cancellation with `cancel_requested` + PID tracking.

## v0.3-local-real-async (2026-05-25)

### Added
- Async backend execution with threading.Thread.
- Frontend polling every 3s.
