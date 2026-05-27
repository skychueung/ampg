import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Cpu, Clock, CheckCircle, AlertTriangle,
  FileText, Beaker, Database, Copy, Check, ChevronDown,
  ChevronUp, Dna, ClipboardList,
  FolderOpen, BarChart3, GitCompare,
} from 'lucide-react'
import { getGenerationRun, getGenerationRunPeptides, getGenerationRunArtifacts } from '@/api/generation'
import { getTask, getTaskLogs } from '@/api/tasks'
import type { GenerationRun, ArtifactFile } from '@/api/generation'
import type { PeptideCandidate } from '@/api/peptides'
import type { TaskRecord } from '@/api/tasks'
import StatusBadge, { type TaskStatus } from '@/components/StatusBadge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type RunStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'BLOCKED' | 'CANCELLED'

interface TimelineItem {
  status: RunStatus | 'ARTIFACTS_SAVED' | 'PEPTIDES_INSERTED'
  label: string
  description: string
  active: boolean
  completed: boolean
  step: number
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString()
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}

function backendBadge(backend: string | undefined): { text: string; className: string } {
  switch (backend) {
    case 'LOCAL_DEMO':
      return { text: 'LOCAL_DEMO', className: 'bg-blue-50 text-blue-700 border-blue-200' }
    case 'LOCAL_REAL_SMOKE':
      return { text: 'LOCAL_REAL_SMOKE', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    case 'SERVER_PRODUCTION':
      return { text: 'SERVER_PRODUCTION', className: 'bg-gray-50 text-gray-500 border-gray-200' }
    default:
      return { text: backend || 'Unknown', className: 'bg-gray-50 text-gray-500 border-gray-200' }
  }
}

function buildTimeline(run: GenerationRun, peptides: PeptideCandidate[], artifacts: ArtifactFile[]): TimelineItem[] {
  const status = run.status as RunStatus
  const items: TimelineItem[] = [
    { status: 'PENDING', label: 'Pending', description: 'Run submitted, task created', active: false, completed: false, step: 1 },
    { status: 'RUNNING', label: 'Running', description: 'AMPGen runner executing', active: false, completed: false, step: 2 },
    { status: 'ARTIFACTS_SAVED', label: 'Artifacts Saved', description: 'CSV/FASTA/logs written', active: false, completed: false, step: 3 },
    { status: 'PEPTIDES_INSERTED', label: 'Peptides Inserted', description: 'Sequences stored in database', active: false, completed: false, step: 4 },
  ]

  // Determine final step based on terminal status
  if (status === 'SUCCEEDED') {
    items.push({ status: 'SUCCEEDED', label: 'Succeeded', description: 'Run completed successfully', active: false, completed: false, step: 5 })
  } else if (status === 'FAILED') {
    items.push({ status: 'FAILED', label: 'Failed', description: 'Run encountered an error', active: false, completed: false, step: 5 })
  } else if (status === 'BLOCKED') {
    items.push({ status: 'BLOCKED', label: 'Blocked', description: 'Run blocked by limits or config', active: false, completed: false, step: 5 })
  } else if (status === 'CANCELLED') {
    items.push({ status: 'CANCELLED', label: 'Cancelled', description: 'Run cancelled by user', active: false, completed: false, step: 5 })
  } else {
    items.push({ status: status, label: status, description: 'Awaiting completion', active: false, completed: false, step: 5 })
  }

  // Mark completed steps
  const statusOrder: RunStatus[] = ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'BLOCKED', 'CANCELLED']
  const currentIdx = statusOrder.indexOf(status)

  items.forEach((item) => {
    if (item.status === 'PENDING') {
      item.completed = true
      item.active = status === 'PENDING'
    } else if (item.status === 'RUNNING') {
      item.completed = currentIdx >= 2 && status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED'
      item.active = status === 'RUNNING'
    } else if (item.status === 'ARTIFACTS_SAVED') {
      item.completed = artifacts.length > 0
      item.active = status === 'RUNNING' && artifacts.length > 0
    } else if (item.status === 'PEPTIDES_INSERTED') {
      item.completed = peptides.length > 0
      item.active = status === 'RUNNING' && peptides.length > 0
    } else if (item.status === status) {
      item.active = true
      item.completed = status === 'SUCCEEDED'
    }
  })

  return items
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GenerationRunDetailPage() {
  const { runId } = useParams<{ runId: string }>()
  const navigate = useNavigate()
  const numericRunId = parseInt(runId || '', 10)

  const [run, setRun] = useState<GenerationRun | null>(null)
  const [peptides, setPeptides] = useState<PeptideCandidate[]>([])
  const [artifacts, setArtifacts] = useState<ArtifactFile[]>([])
  const [artifactDir, setArtifactDir] = useState<string | null>(null)
  const [task, setTask] = useState<TaskRecord | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [artifactLogs, setArtifactLogs] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [copiedFasta, setCopiedFasta] = useState(false)

  const loadData = useCallback(async () => {
    if (isNaN(numericRunId)) {
      setError('Invalid run ID')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [runData, peptideData, artifactData] = await Promise.all([
        getGenerationRun(numericRunId),
        getGenerationRunPeptides(numericRunId).catch(() => null),
        getGenerationRunArtifacts(numericRunId).catch(() => null),
      ])

      setRun(runData)
      if (peptideData) {
        setPeptides(peptideData.peptides)
      }
      if (artifactData) {
        setArtifacts(artifactData.files)
        setArtifactDir(artifactData.artifact_dir)
      }

      // Load task details if available
      if (runData.task_id) {
        try {
          const taskData = await getTask(runData.task_id)
          setTask(taskData)
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      if (String(err).includes('404')) {
        setError('Generation run not found')
      } else {
        setError(err.message || 'Failed to load run details')
      }
    } finally {
      setLoading(false)
    }
  }, [numericRunId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Load logs when expanded
  useEffect(() => {
    if (!showLogs || !run?.task_id) return
    let cancelled = false
    getTaskLogs(run.task_id)
      .then((res) => {
        if (!cancelled) {
          setLogs(res.logs)
          setArtifactLogs(res.artifact_logs || {})
        }
      })
      .catch(() => {
        if (!cancelled) setLogs([])
      })
    return () => { cancelled = true }
  }, [showLogs, run?.task_id])

  const copyFasta = useCallback(() => {
    const lines = peptides.map((p) => `>AMP_${p.id}\n${p.sequence}`)
    navigator.clipboard.writeText(lines.join('\n\n'))
    setCopiedFasta(true)
    setTimeout(() => setCopiedFasta(false), 2000)
  }, [peptides])

  const timeline = run ? buildTimeline(run, peptides, artifacts) : []
  const badge = backendBadge(run?.backend)
  const duration = run?.created_at && run?.completed_at
    ? Math.floor((new Date(run.completed_at).getTime() - new Date(run.created_at).getTime()) / 1000)
    : undefined

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="inline-block w-8 h-8 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-[14px] text-[#6B7280] ml-3">Loading run details...</p>
      </div>
    )
  }

  if (error || !run) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="bg-red-50 border border-[#FECACA] rounded-[8px] p-6 text-center">
          <AlertTriangle size={32} className="text-[#EF4444] mx-auto mb-2" />
          <p className="text-[14px] font-medium text-[#DC2626]">{error || 'Run not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#F0FDFA] flex items-center justify-center">
              <Dna size={20} className="text-[#14B8A6]" />
            </div>
            <div>
              <h1 className="text-[20px] font-semibold text-[#111827]">
                Generation Run #{run.id}
              </h1>
              <p className="text-[13px] text-[#6B7280]">
                {run.mode || 'Sequence-based'} · {run.count} peptides
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium border ${badge.className}`}>
              {badge.text}
            </span>
            <StatusBadge status={run.status as TaskStatus} />
          </div>
        </div>
      </motion.div>

      {/* Scientific Boundary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="p-3 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-3"
      >
        <AlertTriangle size={14} className="text-[#DC2626] mt-0.5 flex-shrink-0" />
        <p className="text-[12px] text-[#991B1B]">
          Computational prediction only. Not experimentally validated.
          {run.backend === 'LOCAL_REAL_SMOKE' && ' Real AMPGen sequence generation completed. AMP score and MIC are not computed.'}
        </p>
      </motion.div>

      {/* Run Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white border border-[#E5E7EB] rounded-[8px] p-5"
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-4 flex items-center gap-2">
          <ClipboardList size={16} className="text-[#14B8A6]" />
          Run Summary
        </h2>
        <div className="grid grid-cols-3 gap-y-4 gap-x-6 text-[13px]">
          <div>
            <span className="text-[#6B7280] block text-[12px] mb-0.5">Run ID</span>
            <span className="font-mono text-[#111827]">{run.id}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block text-[12px] mb-0.5">Task ID</span>
            <span className="font-mono text-[#111827]">{run.task_id ?? '—'}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block text-[12px] mb-0.5">Backend</span>
            <span className="font-medium text-[#111827]">{run.backend}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block text-[12px] mb-0.5">Mode</span>
            <span className="text-[#111827]">{run.mode || '—'}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block text-[12px] mb-0.5">Count</span>
            <span className="text-[#111827]">{run.count}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block text-[12px] mb-0.5">Status</span>
            <StatusBadge status={run.status as TaskStatus} />
          </div>
          <div>
            <span className="text-[#6B7280] block text-[12px] mb-0.5">Created</span>
            <span className="text-[#111827]">{formatDateTime(run.created_at)}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block text-[12px] mb-0.5">Completed</span>
            <span className="text-[#111827]">{formatDateTime(run.completed_at)}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block text-[12px] mb-0.5">Duration</span>
            <span className="text-[#111827]">{duration != null ? formatDuration(duration) : '—'}</span>
          </div>
          {run.min_length != null && (
            <div>
              <span className="text-[#6B7280] block text-[12px] mb-0.5">Length Range</span>
              <span className="text-[#111827]">{run.min_length} – {run.max_length}</span>
            </div>
          )}
          {run.temperature != null && (
            <div>
              <span className="text-[#6B7280] block text-[12px] mb-0.5">Temperature</span>
              <span className="text-[#111827]">{run.temperature}</span>
            </div>
          )}
          {task?.message && (
            <div className="col-span-3">
              <span className="text-[#6B7280] block text-[12px] mb-0.5">Message</span>
              <span className="text-[#111827]">{task.message}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Visual Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-white border border-[#E5E7EB] rounded-[8px] p-5"
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-4 flex items-center gap-2">
          <Clock size={16} className="text-[#14B8A6]" />
          Visual Timeline
        </h2>
        <div className="flex items-center gap-1">
          {timeline.map((item, idx) => (
            <div key={item.status} className="flex items-center flex-1">
              <div className="flex-1 flex flex-col items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    item.completed
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                      : item.active
                      ? 'bg-amber-50 border-amber-500 text-amber-600'
                      : 'bg-gray-50 border-gray-200 text-gray-300'
                  }`}
                >
                  {item.completed ? <CheckCircle size={16} /> : item.active ? <Clock size={16} /> : <span className="text-[11px] font-bold">{idx + 1}</span>}
                </div>
                <div className="text-center">
                  <p className={`text-[11px] font-medium ${item.completed || item.active ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>
                    {item.label}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF] max-w-[100px] leading-tight">{item.description}</p>
                </div>
              </div>
              {idx < timeline.length - 1 && (
                <div className={`w-6 h-[2px] ${item.completed ? 'bg-emerald-400' : 'bg-gray-200'} flex-shrink-0 mb-6`} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Task Status */}
      {task && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white border border-[#E5E7EB] rounded-[8px] p-5"
        >
          <h2 className="text-[16px] font-semibold text-[#111827] mb-4 flex items-center gap-2">
            <Cpu size={16} className="text-[#14B8A6]" />
            Task Status
          </h2>
          <div className="grid grid-cols-3 gap-y-3 gap-x-6 text-[13px]">
            <div>
              <span className="text-[#6B7280] block text-[12px] mb-0.5">Status</span>
              <StatusBadge status={task.status} />
            </div>
            <div>
              <span className="text-[#6B7280] block text-[12px] mb-0.5">Progress</span>
              <span className="text-[#111827]">{task.progress} / {task.total}</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[12px] mb-0.5">Task ID</span>
              <span className="font-mono text-[#111827]">#{task.id}</span>
            </div>
            {task.error_message && (
              <div className="col-span-3">
                <span className="text-[#6B7280] block text-[12px] mb-0.5">Error</span>
                <span className="text-[#DC2626]">{task.error_message}</span>
              </div>
            )}
            {task.artifact_dir && (
              <div className="col-span-3">
                <span className="text-[#6B7280] block text-[12px] mb-0.5">Artifact Directory</span>
                <span className="font-mono text-[12px] text-[#111827]">{task.artifact_dir}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Logs */}
      {run.task_id && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="bg-white border border-[#E5E7EB] rounded-[8px] p-5"
        >
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-2 text-[16px] font-semibold text-[#111827] w-full"
          >
            <FileText size={16} className="text-[#14B8A6]" />
            Logs
            {showLogs ? <ChevronUp size={16} className="text-[#6B7280] ml-auto" /> : <ChevronDown size={16} className="text-[#6B7280] ml-auto" />}
          </button>
          <AnimatePresence>
            {showLogs && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3">
                  {/* In-memory logs */}
                  {logs.length > 0 && (
                    <div>
                      <span className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wide">Task Logs</span>
                      <div className="mt-1 bg-[#1F2937] rounded-[8px] p-3 max-h-[200px] overflow-y-auto space-y-1">
                        {logs.map((line, i) => (
                          <p key={i} className="text-[11px] text-[#E5E7EB] font-mono">{line}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Artifact logs */}
                  {Object.entries(artifactLogs).map(([name, lines]) => (
                    <div key={name}>
                      <span className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wide">{name}</span>
                      <div className="mt-1 bg-[#111827] rounded-[6px] p-2 max-h-[200px] overflow-y-auto space-y-0.5">
                        {lines.length > 0 ? (
                          lines.map((line, i) => (
                            <p key={i} className="text-[10px] text-[#10B981] font-mono">{line}</p>
                          ))
                        ) : (
                          <p className="text-[10px] text-[#6B7280] font-mono">Empty</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {logs.length === 0 && Object.keys(artifactLogs).length === 0 && (
                    <p className="text-[13px] text-[#6B7280]">No logs available yet.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Artifacts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="bg-white border border-[#E5E7EB] rounded-[8px] p-5"
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-4 flex items-center gap-2">
          <FolderOpen size={16} className="text-[#14B8A6]" />
          Artifacts
        </h2>
        {artifacts.length === 0 ? (
          <p className="text-[13px] text-[#6B7280]">
            {artifactDir ? 'No artifact files found in directory.' : 'Artifacts directory not configured.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {artifacts.map((file) => (
              <div
                key={file.name}
                className="flex items-center gap-3 p-3 rounded-[6px] bg-[#F9FAFB] border border-[#E5E7EB]"
              >
                <div className="w-9 h-9 rounded-[6px] bg-white border border-[#E5E7EB] flex items-center justify-center flex-shrink-0">
                  {file.type === 'log' ? <FileText size={16} className="text-[#6B7280]" /> : <Database size={16} className="text-[#14B8A6]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[#111827] truncate">{file.name}</p>
                  <p className="text-[11px] text-[#6B7280]">
                    {file.size_kb} KB · {new Date(file.modified_at).toLocaleString()}
                  </p>
                </div>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 flex-shrink-0">
                  Present
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Generated Peptides */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
        className="bg-white border border-[#E5E7EB] rounded-[8px] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-[#111827] flex items-center gap-2">
            <Beaker size={16} className="text-[#14B8A6]" />
            Generated Peptides
          </h2>
          <span className="text-[12px] text-[#6B7280]">{peptides.length} sequences</span>
        </div>

        {peptides.length === 0 ? (
          <p className="text-[13px] text-[#6B7280]">No peptides generated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                  <th className="text-left px-3 py-2.5">Sequence</th>
                  <th className="text-center px-3 py-2.5">Length</th>
                  <th className="text-center px-3 py-2.5">Net Charge</th>
                  <th className="text-center px-3 py-2.5">Hydro Fraction</th>
                  <th className="text-center px-3 py-2.5">Valid AA</th>
                  <th className="text-center px-3 py-2.5">Status</th>
                  <th className="text-center px-3 py-2.5">Source</th>
                  <th className="text-center px-3 py-2.5">AMP Score</th>
                  <th className="text-center px-3 py-2.5">MIC E.coli</th>
                  <th className="text-center px-3 py-2.5">MIC S.aureus</th>
                </tr>
              </thead>
              <tbody>
                {peptides.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    onClick={() => navigate(`/peptide/${p.id}`)}
                  >
                    <td className="px-3 py-2.5 font-mono text-[13px] text-[#14B8A6]">{p.sequence}</td>
                    <td className="px-3 py-2.5 text-center text-[13px] text-[#111827]">{p.length}</td>
                    <td className="px-3 py-2.5 text-center text-[13px] text-[#111827]">
                      {p.net_charge != null ? `${p.net_charge > 0 ? '+' : ''}${p.net_charge.toFixed(1)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-[13px] text-[#111827]">
                      {p.hydrophobic_fraction != null ? p.hydrophobic_fraction.toFixed(2) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-[13px] text-[#111827]">{p.valid_aa ?? '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F0FDFA] text-[#14B8A6] border border-[#14B8A6]">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-[12px] text-[#6B7280]">
                      {p.source === 'local_demo' ? 'Demo' : p.source === 'local_real_smoke' ? 'Real' : (p.source || '—')}
                    </td>
                    <td className="px-3 py-2.5 text-center text-[12px] text-[#9CA3AF]">Not computed</td>
                    <td className="px-3 py-2.5 text-center text-[12px] text-[#9CA3AF]">Not computed</td>
                    <td className="px-3 py-2.5 text-center text-[12px] text-[#9CA3AF]">Not computed</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="flex flex-wrap items-center gap-3"
      >
        <button
          onClick={() => navigate('/generation')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#14B8A6] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#0D9488] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Generation
        </button>
        <button
          onClick={() => navigate('/candidate-library')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
        >
          <Beaker size={14} />
          View Candidate Library
        </button>
        <button
          onClick={() => navigate('/task-center')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
        >
          <ClipboardList size={14} />
          View Task Center
        </button>
        <button
          onClick={() => navigate('/peptide-analytics')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
        >
          <BarChart3 size={14} />
          View Global Analytics
        </button>
        <button
          onClick={() => navigate('/run-comparison')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
        >
          <GitCompare size={14} />
          Compare Runs
        </button>
        {peptides.length > 0 && (
          <button
            onClick={copyFasta}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
          >
            {copiedFasta ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            Copy FASTA
          </button>
        )}
      </motion.div>
    </div>
  )
}
