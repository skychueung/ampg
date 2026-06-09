import { useEffect, useMemo, useState } from 'react'
import {
  getStorageSummary,
  backupDatabase,
  backupArtifacts,
  createProjectSnapshot,
  listBackups,
  restoreDatabase,
  cleanupArtifacts,
  resetDemoData,
  type StorageSummary,
  type BackupsList,
  type BackupItem,
} from '../api/maintenance'

const ScientificBoundaryBanner = () => (
  <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
    <strong>Local Workstation Mode.</strong> Server Production is not connected.
    Maintenance operations protect your local database and review decisions.
    This does not affect AMPGen original model files.
  </div>
)

export default function LocalMaintenancePage() {

  const [summary, setSummary] = useState<StorageSummary | null>(null)
  const [backups, setBackups] = useState<BackupsList | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Restore state
  const [selectedBackup, setSelectedBackup] = useState('')
  const [restoreConfirm, setRestoreConfirm] = useState('')

  // Cleanup state
  const [cleanupDays, setCleanupDays] = useState(30)
  const [cleanupResult, setCleanupResult] = useState<string | null>(null)

  // Reset state
  const [resetConfirm, setResetConfirm] = useState('')
  const [includeRealRuns, setIncludeRealRuns] = useState(false)
  const [includeReviewData, setIncludeReviewData] = useState(false)

  const backendUnavailable = useMemo(() => !!error && error.includes('Backend unavailable'), [error])

  const loadSummary = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getStorageSummary()
      setSummary(data)
    } catch (e: any) {
      setError('Backend unavailable. Please run scripts/start_backend.ps1')
    } finally {
      setLoading(false)
    }
  }

  const loadBackups = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listBackups()
      setBackups(data)
    } catch (e: any) {
      setError('Backend unavailable. Please run scripts/start_backend.ps1')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
    loadBackups()
  }, [])

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 5000)
  }

  const handleBackupDb = async () => {
    setLoading(true)
    try {
      const res = await backupDatabase()
      showMessage(`Database backed up: ${res.backup_path} (${res.size_mb} MB)`)
      await loadSummary()
      await loadBackups()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBackupArtifacts = async () => {
    setLoading(true)
    try {
      const res = await backupArtifacts()
      showMessage(`Artifacts backed up: ${res.backup_path} (${res.size_mb} MB)`)
      await loadBackups()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSnapshot = async () => {
    setLoading(true)
    try {
      const res = await createProjectSnapshot()
      showMessage(`Snapshot created: ${res.snapshot_path} (${res.size_mb} MB)`)
      await loadBackups()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async () => {
    if (restoreConfirm !== 'RESTORE') {
      setError('Please type RESTORE to confirm.')
      return
    }
    if (!selectedBackup) {
      setError('Please select a backup file.')
      return
    }
    setLoading(true)
    try {
      const res = await restoreDatabase({ backup_filename: selectedBackup, confirm: true })
      if (res.status === 'BLOCKED') {
        setError(res.message)
      } else {
        showMessage(`Database restored: ${res.message}`)
        setRestoreConfirm('')
        setSelectedBackup('')
        await loadSummary()
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCleanupDryRun = async () => {
    setLoading(true)
    try {
      const res = await cleanupArtifacts({ older_than_days: cleanupDays, dry_run: true })
      setCleanupResult(res.message)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCleanupConfirm = async () => {
    setLoading(true)
    try {
      const res = await cleanupArtifacts({ older_than_days: cleanupDays, dry_run: false })
      setCleanupResult(res.message)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (resetConfirm !== 'RESET DEMO') {
      setError('Please type RESET DEMO to confirm.')
      return
    }
    setLoading(true)
    try {
      const res = await resetDemoData({
        confirm: true,
        include_real_runs: includeRealRuns,
        include_review_data: includeReviewData,
      })
      if (res.status === 'BLOCKED') {
        setError(res.message)
      } else {
        showMessage(`${res.message} Pre-reset backup: ${res.pre_reset_backup || 'N/A'}`)
        setResetConfirm('')
        await loadSummary()
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const allBackups: BackupItem[] = useMemo(() => {
    if (!backups) return []
    return [
      ...backups.db_backups,
      ...backups.artifact_backups,
      ...backups.snapshots,
    ]
  }, [backups])

  return (
    <div className="p-6">
      <ScientificBoundaryBanner />

      {backendUnavailable && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Backend unavailable.</strong> Please run scripts/start_backend.ps1
        </div>
      )}

      {error && !backendUnavailable && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">
          {message}
        </div>
      )}

      <h1 className="mb-6 text-2xl font-bold text-slate-900">Local Maintenance</h1>

      {/* Storage Summary */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Storage Summary</h2>
        {summary ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <SummaryCard label="Database" value={`${summary.database_size_mb.toFixed(2)} MB`} sub={summary.database_exists ? 'Exists' : 'Missing'} />
            <SummaryCard label="Artifacts" value={`${summary.artifact_size_mb.toFixed(2)} MB`} sub={`${summary.artifact_file_count} files`} />
            <SummaryCard label="Backups" value={`${summary.backup_count}`} sub={summary.latest_backup ? `Latest: ${summary.latest_backup}` : 'None'} />
            <SummaryCard label="Peptides" value={`${summary.peptide_count}`} sub={`${summary.reviewed_count} reviewed`} />
            <SummaryCard label="Tasks" value={`${summary.task_count}`} sub="Total" />
            <SummaryCard label="Shortlisted" value={`${summary.shortlisted_count}`} sub="Candidates" />
            <SummaryCard label="Selected for Synthesis" value={`${summary.selected_for_synthesis_count}`} sub="Candidates" />
            <SummaryCard label="Backup Dir" value={summary.backup_dir} sub="Local path" />
          </div>
        ) : (
          <p className="text-sm text-slate-500">{loading ? 'Loading...' : 'No data.'}</p>
        )}
      </section>

      {/* Backup Section */}
      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Backup</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleBackupDb} disabled={loading || backendUnavailable} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            Backup Database
          </button>
          <button onClick={handleBackupArtifacts} disabled={loading || backendUnavailable} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            Backup Artifacts
          </button>
          <button onClick={handleSnapshot} disabled={loading || backendUnavailable} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            Create Project Snapshot
          </button>
          <button onClick={loadBackups} disabled={loading} className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300 disabled:opacity-50">
            Refresh Backup List
          </button>
        </div>

        {backups && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Backups</h3>
            {allBackups.length === 0 ? (
              <p className="text-sm text-slate-500">No backups yet.</p>
            ) : (
              <ul className="max-h-48 divide-y divide-slate-100 overflow-auto rounded-md border border-slate-200">
                {allBackups.map((b) => (
                  <li key={b.path} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="truncate text-slate-700" title={b.path}>{b.filename}</span>
                    <span className="ml-2 shrink-0 text-slate-500">{b.size_mb.toFixed(2)} MB</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Restore Section */}
      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Restore Database</h2>
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <strong>Warning:</strong> This will replace the current local SQLite database.
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Select backup</label>
          <select
            value={selectedBackup}
            onChange={(e) => setSelectedBackup(e.target.value)}
            disabled={loading || backendUnavailable}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">-- Select a backup --</option>
            {(backups?.db_backups || []).map((b) => (
              <option key={b.path} value={b.filename}>{b.filename} ({b.size_mb.toFixed(2)} MB)</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Type RESTORE to confirm</label>
          <input
            type="text"
            value={restoreConfirm}
            onChange={(e) => setRestoreConfirm(e.target.value)}
            disabled={loading || backendUnavailable}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="RESTORE"
          />
        </div>
        <button
          onClick={handleRestore}
          disabled={loading || backendUnavailable}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Restore Database
        </button>
      </section>

      {/* Cleanup Section */}
      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Cleanup Artifacts</h2>
        <div className="mb-3 flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Older than (days)</label>
          <input
            type="number"
            min={1}
            value={cleanupDays}
            onChange={(e) => setCleanupDays(Math.max(1, parseInt(e.target.value || '1', 10)))}
            disabled={loading || backendUnavailable}
            className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mb-3 flex gap-3">
          <button
            onClick={handleCleanupDryRun}
            disabled={loading || backendUnavailable}
            className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300 disabled:opacity-50"
          >
            Dry Run
          </button>
          <button
            onClick={handleCleanupConfirm}
            disabled={loading || backendUnavailable}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            Confirm Cleanup
          </button>
        </div>
        {cleanupResult && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {cleanupResult}
          </div>
        )}
      </section>

      {/* Reset Demo Section */}
      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Reset Local Demo Data</h2>
        <div className="mb-3 space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeRealRuns}
              onChange={(e) => setIncludeRealRuns(e.target.checked)}
              disabled={loading || backendUnavailable}
            />
            Include LOCAL_REAL_SMOKE data (dangerous)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeReviewData}
              onChange={(e) => setIncludeReviewData(e.target.checked)}
              disabled={loading || backendUnavailable}
            />
            Include review / shortlist / selected_for_synthesis data (dangerous)
          </label>
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Type RESET DEMO to confirm</label>
          <input
            type="text"
            value={resetConfirm}
            onChange={(e) => setResetConfirm(e.target.value)}
            disabled={loading || backendUnavailable}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="RESET DEMO"
          />
        </div>
        <button
          onClick={handleReset}
          disabled={loading || backendUnavailable}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Reset Local Demo Data
        </button>
        <p className="mt-2 text-xs text-slate-500">
          Default: only LOCAL_DEMO peptides without review data are removed. A pre-reset backup is created automatically.
        </p>
      </section>
    </div>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  )
}
