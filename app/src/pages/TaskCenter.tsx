import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  RefreshCw,
  Zap,
  CheckCircle,
  XCircle,
  FlaskConical,
  Filter,
  Shield,
  BarChart3,
  Download,
  Eye,
  RotateCcw,
  X,
  Copy,
  Ban,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Microscope,
  Beaker,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'
import type { TaskStatus } from '@/components/StatusBadge'
import { formatRelativeTime } from '@/data/demoData'
import { listTasks, getTaskLogs } from '@/api/tasks'
import type { TaskRecord as ApiTaskRecord } from '@/api/tasks'
import { useTranslation } from '@/i18n/LanguageContext'

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type FilterTab = 'ALL' | TaskStatus

interface ExtendedTask {
  id: number
  type: string
  status: TaskStatus
  progress: number
  total: number
  createdAt: Date
  completedAt?: Date
  errorMessage?: string
  message?: string
  artifactDir?: string
  duration?: number
  logs?: string[]
}

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const TASK_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  'AMP Generation': { icon: FlaskConical, color: 'text-[#14B8A6]' },
  'Physicochemical Filter': { icon: Filter, color: 'text-[#6B7280]' },
  'Filter': { icon: Filter, color: 'text-[#6B7280]' },
  'AMP Filtering': { icon: Filter, color: 'text-[#6B7280]' },
  'AMP Discriminator': { icon: Shield, color: 'text-[#14B8A6]' },
  'MIC Scoring': { icon: BarChart3, color: 'text-[#D97706]' },
  'Structure Prediction': { icon: Microscope, color: 'text-[#8B5CF6]' },
  'Report Export': { icon: Download, color: 'text-[#14B8A6]' },
  'Batch Export': { icon: Download, color: 'text-[#14B8A6]' },
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'RUNNING', label: 'Running' },
  { key: 'SUCCEEDED', label: 'Completed' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'BLOCKED', label: 'Blocked' },
  { key: 'PENDING', label: 'Pending' },
]

const TAB_LABEL_KEYS: Record<string, string> = {
  ALL: 'tasks.tabAll',
  RUNNING: 'tasks.tabRunning',
  SUCCEEDED: 'tasks.tabCompleted',
  FAILED: 'tasks.tabFailed',
  BLOCKED: 'tasks.tabBlocked',
  PENDING: 'tasks.tabPending',
}

const PAGE_SIZE = 10

/* -------------------------------------------------------------------------- */
/*                               Helper Functions                             */
/* -------------------------------------------------------------------------- */

function adaptApiTask(task: ApiTaskRecord): ExtendedTask {
  const createdAt = new Date(task.created_at)
  const completedAt = task.completed_at ? new Date(task.completed_at) : undefined

  const duration = completedAt
    ? Math.floor((completedAt.getTime() - createdAt.getTime()) / 1000)
    : task.status === 'RUNNING'
      ? Math.floor((Date.now() - createdAt.getTime()) / 1000)
      : undefined

  return {
    id: task.id,
    type: task.type,
    status: task.status,
    progress: task.progress,
    total: task.total,
    createdAt,
    completedAt,
    errorMessage: task.error_message,
    message: task.message,
    artifactDir: task.artifact_dir,
    duration,
  }
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

/* -------------------------------------------------------------------------- */
/*                               Animation Variants                           */
/* -------------------------------------------------------------------------- */

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
}

const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

const rowStagger = {
  animate: { transition: { staggerChildren: 0.03 } },
}

const rowFadeIn = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

/* -------------------------------------------------------------------------- */
/*                                Toast Component                             */
/* -------------------------------------------------------------------------- */

function Toast({
  message,
  type,
  onDone,
}: {
  message: string
  type: 'success' | 'error'
  onDone: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -20, x: '-50%' }}
      className={cn(
        'fixed top-4 left-1/2 z-[60] px-4 py-2.5 rounded-[8px] shadow-lg text-[14px] font-medium flex items-center gap-2 border',
        type === 'success'
          ? 'bg-emerald-50 text-[#059669] border-[#10B981]'
          : 'bg-red-50 text-[#DC2626] border-[#EF4444]'
      )}
    >
      {type === 'success' ? <Check size={14} /> : <XCircle size={14} />}
      {message}
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/*                               Task Type Badge                              */
/* -------------------------------------------------------------------------- */

function TaskTypeBadge({ type }: { type: string }) {
  const config = TASK_TYPE_CONFIG[type] || { icon: Beaker, color: 'text-[#6B7280]' }
  const Icon = config.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium', config.color)}>
      <Icon size={14} />
      {type}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*                                 Main Component                             */
/* -------------------------------------------------------------------------- */

export default function TaskCenter() {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<ExtendedTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTask, setSelectedTask] = useState<ExtendedTask | null>(null)
  const [toastData, setToastData] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [taskLogs, setTaskLogs] = useState<string[]>([])
  const [artifactLogs, setArtifactLogs] = useState<Record<string, string[]>>({})
  const [logsLoading, setLogsLoading] = useState(false)

  /* -- Fetch tasks from API -- */
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listTasks()
      setTasks(data.map(adaptApiTask))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load tasks from server'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  /* -- Reset page on filter change -- */
  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter])

  /* -- Keep selected task in sync -- */
  useEffect(() => {
    if (!selectedTask) return
    const task = tasks.find((t) => t.id === selectedTask.id)
    if (task) setSelectedTask(task)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks])

  /* -- Reset logs when selected task changes -- */
  useEffect(() => {
    setTaskLogs([])
    setShowLogs(false)
  }, [selectedTask?.id])

  /* -- Fetch logs when viewing a task -- */
  useEffect(() => {
    if (!selectedTask || !showLogs) return
    let cancelled = false
    setLogsLoading(true)
    getTaskLogs(selectedTask.id)
      .then((res) => {
        if (!cancelled) {
          setTaskLogs(res.logs)
          setArtifactLogs(res.artifact_logs || {})
        }
      })
      .catch(() => {
        if (!cancelled) setTaskLogs([])
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedTask, showLogs])

  /* -- Derived data -- */
  const counts = useMemo(() => {
    const c = {
      RUNNING: tasks.filter((t) => t.status === 'RUNNING').length,
      SUCCEEDED: tasks.filter((t) => t.status === 'SUCCEEDED').length,
      FAILED: tasks.filter((t) => t.status === 'FAILED').length,
      BLOCKED: tasks.filter((t) => t.status === 'BLOCKED').length,
      PENDING: tasks.filter((t) => t.status === 'PENDING').length,
    }
    return { ...c, ALL: tasks.length, total: tasks.length }
  }, [tasks])

  const filteredTasks = useMemo(
    () => (activeFilter === 'ALL' ? tasks : tasks.filter((t) => t.status === activeFilter)),
    [tasks, activeFilter]
  )

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE))
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredTasks.slice(start, start + PAGE_SIZE)
  }, [filteredTasks, currentPage])

  /* -- Handlers -- */
  const refreshTasks = useCallback(() => {
    fetchTasks()
    setToastData({ message: 'Tasks refreshed', type: 'success' })
  }, [fetchTasks])

  const retryTask = useCallback((taskId: number) => {
    setToastData({ message: `Task #${taskId} queued for retry`, type: 'success' })
  }, [])

  const cancelTask = useCallback((taskId: number) => {
    setToastData({ message: `Task #${taskId} cancelled`, type: 'error' })
    if (selectedTask?.id === taskId) setSelectedTask(null)
  }, [selectedTask])

  const copyTaskId = useCallback((id: number) => {
    navigator.clipboard.writeText(`#${id}`).catch(() => {})
    setToastData({ message: `Task ID #${id} copied`, type: 'success' })
  }, [])

  /* -- Pagination helpers -- */
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 3) return [1, 2, 3, 4, 5]
    if (currentPage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
  }, [currentPage, totalPages])

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toastData && <Toast message={toastData.message} type={toastData.type} onDone={() => setToastData(null)} />}
      </AnimatePresence>

      {/* Page Header */}
      <motion.div variants={fadeInUp} initial="initial" animate="animate">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-semibold text-[#111827]">{t('tasks.title') as string}</h1>
            <p className="text-[14px] text-[#6B7280] mt-0.5">{t('tasks.subtitle') as string}</p>
          </div>
          <button
            onClick={refreshTasks}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#14B8A6] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#0D9488] transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-4 gap-4"
      >
        {/* Running */}
        <motion.div
          variants={fadeInUp}
          className="bg-white border border-[#E5E7EB] rounded-[8px] p-4 border-l-[3px] border-l-[#F59E0B] shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-[6px] bg-amber-50 flex items-center justify-center">
              <Zap size={16} className="text-[#F59E0B]" />
            </div>
          </div>
          <div className={cn('text-[28px] font-bold text-[#111827]', counts.RUNNING > 0 && 'animate-pulse-amber')}>
            {counts.RUNNING}
          </div>
          <div className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mt-0.5">{t('tasks.runningTasks') as string}</div>
        </motion.div>

        {/* Completed */}
        <motion.div
          variants={fadeInUp}
          className="bg-white border border-[#E5E7EB] rounded-[8px] p-4 border-l-[3px] border-l-[#10B981] shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-[6px] bg-emerald-50 flex items-center justify-center">
              <CheckCircle size={16} className="text-[#10B981]" />
            </div>
          </div>
          <div className="text-[28px] font-bold text-[#111827]">{counts.SUCCEEDED}</div>
          <div className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mt-0.5">{t('tasks.completedTasks') as string}</div>
        </motion.div>

        {/* Failed */}
        <motion.div
          variants={fadeInUp}
          className="bg-white border border-[#E5E7EB] rounded-[8px] p-4 border-l-[3px] border-l-[#EF4444] shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-[6px] bg-red-50 flex items-center justify-center">
              <XCircle size={16} className="text-[#EF4444]" />
            </div>
          </div>
          <div className="text-[28px] font-bold text-[#111827]">{counts.FAILED}</div>
          <div className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mt-0.5">{t('tasks.failedTasks') as string}</div>
        </motion.div>

        {/* Total */}
        <motion.div
          variants={fadeInUp}
          className="bg-white border border-[#E5E7EB] rounded-[8px] p-4 border-l-[3px] border-l-[#6B7280] shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-[6px] bg-gray-50 flex items-center justify-center">
              <Activity size={16} className="text-[#6B7280]" />
            </div>
          </div>
          <div className="text-[28px] font-bold text-[#111827]">{counts.total}</div>
          <div className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mt-0.5">{t('tasks.totalTasks') as string}</div>
        </motion.div>
      </motion.div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-[#FECACA] rounded-[8px] p-4 flex items-start gap-3"
          >
            <AlertTriangle size={18} className="text-[#EF4444] shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-medium text-[#DC2626]">Failed to load tasks</p>
              <p className="text-[13px] text-[#DC2626] mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Tabs */}
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="relative flex items-center gap-1 border-b border-[#E5E7EB]">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={cn(
              'relative px-4 py-2.5 text-[14px] font-medium transition-colors',
              activeFilter === tab.key ? 'text-[#111827]' : 'text-[#6B7280] hover:text-[#111827]'
            )}
          >
            {t(TAB_LABEL_KEYS[tab.key]) as string}
            <span
              className={cn(
                'ml-1.5 text-[12px]',
                activeFilter === tab.key ? 'text-[#14B8A6]' : 'text-[#9CA3AF]'
              )}
            >
              ({counts[tab.key]})
            </span>
            {activeFilter === tab.key && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#14B8A6]"
                transition={{ duration: 0.2, ease: 'easeOut' }}
              />
            )}
          </button>
        ))}
      </motion.div>

      {/* Task Table */}
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] w-[80px]">
                  {t('tasks.columnTaskID') as string}
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] w-[150px]">
                  {t('tasks.columnType') as string}
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] w-[110px]">
                  {t('tasks.columnStatus') as string}
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] w-[90px]">
                  {t('tasks.columnCreated') as string}
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] w-[80px]">
                  {t('tasks.columnRuntime') as string}
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] w-[160px]">
                  {t('tasks.columnProgress') as string}
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] w-[140px]">
                  {t('tasks.columnOutput') as string}
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] w-[100px]">
                  {t('tasks.columnActions') as string}
                </th>
              </tr>
            </thead>
            <motion.tbody variants={rowStagger} initial="initial" animate="animate">
              {loading && paginatedTasks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <RefreshCw size={24} className="text-[#D1D5DB] animate-spin mx-auto mb-2" />
                    <p className="text-[13px] text-[#6B7280]">Loading tasks...</p>
                  </td>
                </tr>
              )}
              {!loading && paginatedTasks.map((task) => (
                <motion.tr
                  key={task.id}
                  variants={rowFadeIn}
                  className={cn(
                    'border-b border-[#E5E7EB] transition-colors',
                    task.status === 'RUNNING'
                      ? 'border-l-[3px] border-l-[#F59E0B] bg-amber-50/30'
                      : 'hover:bg-[#F9FAFB]'
                  )}
                >
                  {/* Task ID */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => copyTaskId(task.id)}
                      className="font-mono text-[13px] text-[#14B8A6] hover:underline cursor-pointer inline-flex items-center gap-1"
                      title={t('tasks.clickToCopy') as string}
                    >
                      #{task.id}
                      <Copy size={10} className="opacity-50" />
                    </button>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <TaskTypeBadge type={task.type} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status} />
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-[13px] text-[#6B7280]">{formatRelativeTime(task.createdAt)}</td>

                  {/* Runtime */}
                  <td className="px-4 py-3 text-[13px] text-[#6B7280]">
                    {task.duration ? formatDuration(task.duration) : '—'}
                  </td>

                  {/* Progress */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-[6px] bg-[#E5E7EB] rounded-full overflow-hidden">
                        <motion.div
                          className={cn(
                            'h-full rounded-full',
                            task.status === 'SUCCEEDED'
                              ? 'bg-[#10B981]'
                              : task.status === 'FAILED'
                                ? 'bg-[#EF4444]'
                                : 'bg-[#14B8A6]'
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${task.total > 0 ? (task.progress / task.total) * 100 : 0}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[11px] text-[#6B7280] tabular-nums w-[50px] text-right">
                        {task.progress}/{task.total}
                      </span>
                    </div>
                  </td>

                  {/* Output */}
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-[#6B7280] truncate max-w-[130px] block">
                      {task.status === 'RUNNING' && (task.message || (t('tasks.outputProcessing') as string))}
                      {task.status === 'SUCCEEDED' && (task.message || (t('tasks.outputCompleted') as string))}
                      {task.status === 'FAILED' && (
                        <span className="text-[#EF4444]">{task.errorMessage || (t('common.failed') as string)}</span>
                      )}
                      {task.status === 'PENDING' && (task.message || (t('tasks.outputWaiting') as string))}
                      {task.status === 'BLOCKED' && (
                        <span className="text-[#D97706] font-medium">{task.message || task.errorMessage || (t('tasks.outputBlocked') as string)}</span>
                      )}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedTask(task)
                          setShowLogs(false)
                        }}
                        className="p-1.5 rounded-[6px] hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827] transition-colors"
                        title={t('tasks.viewDetails') as string}
                      >
                        <Eye size={14} />
                      </button>
                      {task.status === 'FAILED' && (
                        <button
                          onClick={() => retryTask(task.id)}
                          className="p-1.5 rounded-[6px] hover:bg-amber-50 text-[#6B7280] hover:text-[#D97706] transition-colors"
                          title={t('tasks.retry') as string}
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                      {task.status === 'RUNNING' && (
                        <button
                          onClick={() => cancelTask(task.id)}
                          className="p-1.5 rounded-[6px] hover:bg-red-50 text-[#6B7280] hover:text-[#EF4444] transition-colors"
                          title={t('tasks.cancel') as string}
                        >
                          <Ban size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>

        {/* Empty state */}
        {!loading && paginatedTasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <Beaker size={48} className="text-[#D1D5DB] mb-3" />
            <p className="text-[16px] font-semibold text-[#111827]">{t('tasks.noTasksFound') as string}</p>
            <p className="text-[14px] text-[#6B7280] mt-1">{t('tasks.tryAdjustingFilter') as string}</p>
          </motion.div>
        )}

        {/* Pagination */}
        {filteredTasks.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB]">
            <span className="text-[12px] text-[#6B7280]">
              {(t('tasks.showingResults') as string)
                .replace('{{start}}', String(Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredTasks.length)))
                .replace('{{end}}', String(Math.min(currentPage * PAGE_SIZE, filteredTasks.length)))
                .replace('{{total}}', String(filteredTasks.length))}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-[6px] hover:bg-[#F3F4F6] disabled:opacity-30 disabled:cursor-not-allowed text-[#6B7280] transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {pageNumbers.map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    'w-7 h-7 rounded-[6px] text-[12px] font-medium flex items-center justify-center transition-colors',
                    currentPage === pageNum ? 'bg-[#14B8A6] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                  )}
                >
                  {pageNum}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-[6px] hover:bg-[#F3F4F6] disabled:opacity-30 disabled:cursor-not-allowed text-[#6B7280] transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*                         Task Detail Drawer                          */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {selectedTask && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setSelectedTask(null)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="fixed right-0 top-0 bottom-0 w-[420px] bg-white border-l border-[#E5E7EB] shadow-[-4px_0_16px_rgba(0,0,0,0.08)] z-50 overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-5 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-3">
                  <h2 className="text-[18px] font-semibold text-[#111827]">{t('tasks.drawerTitle') as string} #{selectedTask.id}</h2>
                  <StatusBadge status={selectedTask.status} />
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 rounded-[6px] hover:bg-[#F3F4F6] text-[#6B7280] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-5 space-y-5">
                {/* Task Info */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[13px] text-[#6B7280]">{t('tasks.drawerType') as string}</span>
                    <span className="text-[13px] text-[#111827] font-medium">{selectedTask.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[13px] text-[#6B7280]">{t('tasks.drawerStarted') as string}</span>
                    <span className="text-[13px] text-[#111827] font-medium">{format(selectedTask.createdAt, 'MMM d, yyyy, HH:mm:ss')}</span>
                  </div>
                  {selectedTask.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-[13px] text-[#6B7280]">Completed</span>
                      <span className="text-[13px] text-[#111827] font-medium">{format(selectedTask.completedAt, 'MMM d, yyyy, HH:mm:ss')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[13px] text-[#6B7280]">{t('tasks.drawerDuration') as string}</span>
                    <span className="text-[13px] text-[#111827] font-medium">
                      {selectedTask.duration
                        ? formatDuration(selectedTask.duration) +
                          (selectedTask.status === 'RUNNING' ? ' (running)' : '')
                        : '—'}
                    </span>
                  </div>
                  {selectedTask.artifactDir && (
                    <div className="flex justify-between">
                      <span className="text-[13px] text-[#6B7280]">Artifact Dir</span>
                      <span className="text-[13px] text-[#111827] font-medium">{selectedTask.artifactDir}</span>
                    </div>
                  )}
                  {selectedTask.message && (
                    <div className="flex justify-between">
                      <span className="text-[13px] text-[#6B7280]">Message</span>
                      <span className="text-[13px] text-[#111827] font-medium">{selectedTask.message}</span>
                    </div>
                  )}
                </div>

                {/* Parameters Card */}
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] p-4">
                  <h3 className="text-[13px] font-semibold text-[#111827] mb-3">{t('tasks.parameters') as string}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[12px] text-[#6B7280]">Task Type</span>
                      <span className="text-[12px] text-[#111827] font-mono">{selectedTask.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[12px] text-[#6B7280]">Total Items</span>
                      <span className="text-[12px] text-[#111827] font-mono">{selectedTask.total}</span>
                    </div>
                    {selectedTask.message && (
                      <div className="flex justify-between">
                        <span className="text-[12px] text-[#6B7280]">Message</span>
                        <span className="text-[12px] text-[#111827] font-mono">{selectedTask.message}</span>
                      </div>
                    )}
                    {selectedTask.artifactDir && (
                      <div className="flex justify-between">
                        <span className="text-[12px] text-[#6B7280]">Artifact Dir</span>
                        <span className="text-[12px] text-[#111827] font-mono">{selectedTask.artifactDir}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Section */}
                <div>
                  <h3 className="text-[13px] font-semibold text-[#111827] mb-2">{t('tasks.drawerProgress') as string}</h3>
                  <div className="h-[12px] bg-[#E5E7EB] rounded-full overflow-hidden mb-2">
                    <motion.div
                      className={cn(
                        'h-full rounded-full',
                        selectedTask.status === 'SUCCEEDED'
                          ? 'bg-[#10B981]'
                          : selectedTask.status === 'FAILED'
                            ? 'bg-[#EF4444]'
                            : 'bg-[#14B8A6]'
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedTask.total > 0 ? (selectedTask.progress / selectedTask.total) * 100 : 0}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-[12px] text-[#6B7280]">
                    {selectedTask.progress} of {selectedTask.total} items processed
                    {selectedTask.status === 'RUNNING' && selectedTask.total > selectedTask.progress && (
                      <span className="ml-1 text-[#D97706]">(~{Math.ceil((selectedTask.total - selectedTask.progress) / 3)} min remaining)</span>
                    )}
                  </p>
                </div>

                {/* Output Preview */}
                {selectedTask.message && selectedTask.status === 'SUCCEEDED' && (
                  <div>
                    <h3 className="text-[13px] font-semibold text-[#111827] mb-2">{t('tasks.drawerOutput') as string}</h3>
                    <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] p-3">
                      <p className="text-[12px] text-[#6B7280] font-mono whitespace-pre-wrap">{selectedTask.message}</p>
                    </div>
                  </div>
                )}

                {/* Blocked Banner */}
                {selectedTask.status === 'BLOCKED' && (
                  <div className="bg-amber-50 border border-[#FCD34D] rounded-[8px] p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} className="text-[#D97706]" />
                      <h3 className="text-[13px] font-semibold text-[#D97706]">Blocked</h3>
                    </div>
                    <p className="text-[12px] text-[#D97706]">{selectedTask.message || selectedTask.errorMessage || 'Task is blocked'}</p>
                  </div>
                )}

                {/* Error Message */}
                {selectedTask.errorMessage && selectedTask.status !== 'BLOCKED' && (
                  <div className="bg-red-50 border border-[#FECACA] rounded-[8px] p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} className="text-[#EF4444]" />
                      <h3 className="text-[13px] font-semibold text-[#DC2626]">{t('tasks.drawerError') as string}</h3>
                    </div>
                    <p className="text-[12px] text-[#DC2626]">{selectedTask.errorMessage}</p>
                  </div>
                )}

                {/* Logs Section */}
                <div>
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    className="flex items-center gap-1 text-[13px] font-medium text-[#14B8A6] hover:text-[#0D9488] transition-colors mb-2"
                  >
                    {showLogs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {t('tasks.logs') as string}
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
                        <div className="bg-[#1F2937] rounded-[8px] p-3 max-h-[200px] overflow-y-auto space-y-1">
                          {logsLoading ? (
                            <p className="text-[11px] text-[#9CA3AF] font-mono">Loading logs...</p>
                          ) : taskLogs.length > 0 ? (
                            taskLogs.map((log, i) => (
                              <p key={i} className="text-[11px] text-[#E5E7EB] font-mono">
                                {log}
                              </p>
                            ))
                          ) : (
                            <p className="text-[11px] text-[#9CA3AF] font-mono">No logs available</p>
                          )}
                        </div>
                        {/* Artifact logs (stdout/stderr) */}
                        {Object.keys(artifactLogs).length > 0 && (
                          <div className="mt-3 space-y-2">
                            {Object.entries(artifactLogs).map(([name, lines]) => (
                              <div key={name}>
                                <div className="text-[11px] font-medium text-[#9CA3AF] mb-1 uppercase tracking-wide">
                                  {name}
                                </div>
                                <div className="bg-[#111827] rounded-[6px] p-2 max-h-[150px] overflow-y-auto space-y-0.5">
                                  {lines.length > 0 ? (
                                    lines.map((line, i) => (
                                      <p key={i} className="text-[10px] text-[#10B981] font-mono">
                                        {line}
                                      </p>
                                    ))
                                  ) : (
                                    <p className="text-[10px] text-[#6B7280] font-mono">Empty</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {selectedTask.status === 'RUNNING' && (
                    <>
                      <button
                        onClick={() => cancelTask(selectedTask.id)}
                        className="flex-1 px-3 py-2 border border-[#F59E0B] text-[#D97706] text-[13px] font-medium rounded-[6px] hover:bg-amber-50 transition-colors"
                      >
                        {t('tasks.pauseTask') as string}
                      </button>
                      <button
                        onClick={() => cancelTask(selectedTask.id)}
                        className="flex-1 px-3 py-2 text-[#EF4444] text-[13px] font-medium rounded-[6px] hover:bg-red-50 transition-colors"
                      >
                        {t('tasks.cancel') as string}
                      </button>
                    </>
                  )}
                  {selectedTask.status === 'FAILED' && (
                    <button
                      onClick={() => {
                        retryTask(selectedTask.id)
                        setSelectedTask(null)
                      }}
                      className="flex-1 px-3 py-2 bg-[#14B8A6] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#0D9488] transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={14} />
                      {t('tasks.retry') as string}
                    </button>
                  )}
                  {selectedTask.status === 'SUCCEEDED' && (
                    <button
                      onClick={() => setSelectedTask(null)}
                      className="flex-1 px-3 py-2 bg-[#14B8A6] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#0D9488] transition-colors"
                    >
                      {t('common.close') as string}
                    </button>
                  )}
                  {(selectedTask.status === 'PENDING' || selectedTask.status === 'BLOCKED') && (
                    <button
                      onClick={() => setSelectedTask(null)}
                      className="flex-1 px-3 py-2 border border-[#E5E7EB] text-[#111827] text-[13px] font-medium rounded-[6px] hover:bg-[#F9FAFB] transition-colors"
                    >
                      {t('common.close') as string}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
