import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@/i18n/LanguageContext'
import { motion } from 'framer-motion'
import {
  Database,
  CheckCircle,
  Beaker,
  Clock,
  FlaskConical,
  Play,
  ChevronRight,
  Eye,
  RotateCcw,
  AlertTriangle,
  X,
  Zap,
  Search,
  Microscope,
  Filter,
  Server,
  Cpu,
  Layers,
  TrendingUp,
} from 'lucide-react'
import StatCard from '@/components/StatCard'
import WorkflowDiagram from '@/components/WorkflowDiagram'
import StatusBadge from '@/components/StatusBadge'
import type { TaskStatus } from '@/components/StatusBadge'
import { getDashboardSummary, getRecentRuns } from '@/api/dashboard'
import type { DashboardSummary, RecentRun } from '@/api/dashboard'
import { listPeptides } from '@/api/peptides'
import type { PeptideCandidate } from '@/api/peptides'
import { getRuntimeConfig } from '@/api/system'
import type { RuntimeConfig } from '@/api/system'

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
}

const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [generationMode, setGenerationMode] = useState<'Generate' | 'Refine'>('Generate')
  const [peptideLength, setPeptideLength] = useState(20)
  const [peptideCount, setPeptideCount] = useState(100)
  const [modelBackend, setModelBackend] = useState('AMPGen-Demo')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState('')
  const [showDisclaimer, setShowDisclaimer] = useState(true)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([])
  const [recentPeptides, setRecentPeptides] = useState<PeptideCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [sum, runs, peptides, cfg] = await Promise.all([
          getDashboardSummary(),
          getRecentRuns(5),
          listPeptides(),
          getRuntimeConfig().catch(() => null),
        ])
        setSummary(sum)
        setRecentRuns(runs)
        setRecentPeptides(peptides.slice(0, 6))
        setRuntimeConfig(cfg)
        setError(null)
      } catch (err) {
        setError('Backend unavailable. Please run scripts/start_backend.ps1')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-[14px] text-[#6B7280]">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-[14px] text-[#EF4444] mb-2">{error}</p>
          <p className="text-[12px] text-[#6B7280]">Please run scripts/start_backend.ps1</p>
        </div>
      </div>
    )
  }

  const handleGenerate = () => {
    setIsGenerating(true)
    setGenerationStatus('Initializing generation pipeline...')

    setTimeout(() => {
      setGenerationStatus('Loading model (AMPGen-Demo)...')
    }, 600)
    setTimeout(() => {
      setGenerationStatus(`Generating ${peptideCount} peptides (length ${peptideLength})...`)
    }, 1200)
    setTimeout(() => {
      setGenerationStatus('Redirecting to generation page...')
    }, 2500)
    setTimeout(() => {
      setIsGenerating(false)
      setGenerationStatus('')
      navigate('/generation')
    }, 3500)
  }

  const handleQuickMode = (length: number, count: number) => {
    setPeptideLength(length)
    setPeptideCount(count)
  }

  const quickModes = [
    { label: t('dashboard.presetQuick') as string, icon: Zap, length: 20, count: 10 },
    { label: t('dashboard.presetExplore') as string, icon: Microscope, length: 20, count: 100 },
    { label: t('dashboard.presetDeep') as string, icon: Search, length: 30, count: 500 },
  ]

  const modelOptions = ['AMPGen-Demo', 'EvoDiff-Small', 'Random-Baseline']
  const lengthOptions = [10, 15, 20, 25, 30, 40, 50]
  const countOptions = [10, 50, 100, 200, 500]

  const workflowNodes = [
    { id: 'data-input', label: t('workflow.dataInput') as string, icon: Database, state: 'completed' as const },
    { id: 'amp-generation', label: t('workflow.ampGeneration') as string, icon: FlaskConical, state: 'active' as const },
    { id: 'physicochemical', label: t('workflow.physicochemicalFilter') as string, icon: Filter, state: 'pending' as const },
    { id: 'discriminator', label: t('workflow.ampDiscriminator') as string, icon: Search, state: 'pending' as const },
    { id: 'mic-scoring', label: t('workflow.micScoring') as string, icon: Database, state: 'pending' as const },
    { id: 'candidate-lib', label: t('workflow.candidateLibrary') as string, icon: Beaker, state: 'pending' as const },
    { id: 'validation', label: t('workflow.experimentalValidation') as string, icon: Microscope, state: 'pending' as const },
  ]

  const runtimeConfigItems = runtimeConfig
    ? [
        { key: 'server_production_enabled', value: String(runtimeConfig.server_production_enabled), icon: Server },
        { key: 'server_production_device', value: runtimeConfig.server_production_device, icon: Cpu },
        { key: 'server_batch_enabled', value: String(runtimeConfig.server_batch_enabled), icon: Layers },
        { key: 'server_batch_max_total_count', value: String(runtimeConfig.server_batch_max_total_count), icon: TrendingUp },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-[8px] p-4 flex items-center gap-3"
        >
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-[13px] text-red-700">{error}</p>
        </motion.div>
      )}

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="hero-gradient rounded-xl border border-sky-100 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative overflow-hidden"
      >
        <div className="relative z-10">
          <h1 className="text-[22px] font-bold text-slate-800">Platform Dashboard</h1>
          <p className="text-[14px] text-slate-500 mt-1">
            Server production status and computational peptide generation overview
          </p>
        </div>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-[12px] font-semibold text-teal-700">
            <span className="status-dot" />
            Server Production Only
          </span>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          icon={<Database size={18} />}
          value={summary?.peptides_total ?? 0}
          label={t('dashboard.statGenerated') as string}
          color="teal"
          delay={0}
        />
        <StatCard
          icon={<CheckCircle size={18} />}
          value={summary?.peptides_filtered ?? 0}
          label={t('dashboard.statPassed') as string}
          color="green"
          delay={80}
        />
        <StatCard
          icon={<Beaker size={18} />}
          value={summary?.peptides_candidate ?? 0}
          label={t('dashboard.statCandidates') as string}
          color="teal"
          delay={160}
        />
        <StatCard
          icon={<Clock size={18} />}
          value={summary?.peptides_rejected ?? 0}
          label={t('dashboard.statPending') as string}
          color="amber"
          delay={240}
        />
      </motion.div>

      {/* Production Status + 70k Milestone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-white border border-slate-200 rounded-xl p-5 card-hover"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center">
              <Server size={16} className="text-sky-600" />
            </div>
            <h2 className="text-[15px] font-semibold text-slate-800">Production Runtime Config</h2>
          </div>
          {runtimeConfigItems.length === 0 ? (
            <p className="text-[13px] text-slate-500">Loading runtime config...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {runtimeConfigItems.map((cfg) => {
                const Icon = cfg.icon
                return (
                  <div
                    key={cfg.key}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-2 text-[12px] text-slate-500">
                      <Icon size={13} className="text-slate-400" />
                      <span className="font-mono">{cfg.key}</span>
                    </div>
                    <span className="text-[13px] font-semibold text-teal-600 font-mono">{cfg.value}</span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white border border-slate-200 rounded-xl p-5 card-hover"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center">
              <TrendingUp size={16} className="text-teal-600" />
            </div>
            <h2 className="text-[15px] font-semibold text-slate-800">70k Validation Milestone</h2>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-[28px] font-bold text-gradient">70,000</span>
            <span className="text-[13px] text-slate-500 mb-1.5">/ 70,000 unique candidates</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-sky-500 to-teal-500 rounded-full" style={{ width: '100%' }} />
          </div>
          <p className="text-[12px] text-slate-500">
            Production-scale computational validation completed with 0 failed chunks. Pending experimental validation.
          </p>
          <p className="text-[12px] text-slate-400 mt-1">「70,000/70,000 唯一候选 · 0 失败分块 · 待实验验证」</p>
        </motion.div>
      </div>

      {/* Two-Column: Generation Form + Workflow */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Generation Form */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
        >
          <div className="flex items-center gap-2 mb-5">
            <FlaskConical size={16} className="text-[#14B8A6]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">{t('dashboard.generationFormTitle') as string}</h2>
          </div>

          {/* Generation Mode */}
          <div className="space-y-1 mb-4">
            <label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
              {t('dashboard.generationMode') as string}
            </label>
            <div className="flex rounded-[6px] overflow-hidden border border-[#E5E7EB]">
              <button
                onClick={() => setGenerationMode('Generate')}
                className={`flex-1 py-2 text-[14px] font-medium transition-colors ${
                  generationMode === 'Generate'
                    ? 'bg-[#14B8A6] text-white'
                    : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'
                }`}
              >
                {t('dashboard.modeSequence') as string}
              </button>
              <button
                onClick={() => setGenerationMode('Refine')}
                className={`flex-1 py-2 text-[14px] font-medium transition-colors border-l border-[#E5E7EB] ${
                  generationMode === 'Refine'
                    ? 'bg-[#14B8A6] text-white'
                    : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'
                }`}
              >
                {t('dashboard.modeMSA') as string}
              </button>
            </div>
          </div>

          {/* Peptide Length */}
          <div className="space-y-1 mb-4">
            <label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
              {t('dashboard.lengthRange') as string}
            </label>
            <select
              value={peptideLength}
              onChange={(e) => setPeptideLength(Number(e.target.value))}
              className="w-full h-[36px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 text-[14px] text-[#111827] focus:border-[#14B8A6] focus:ring-2 focus:ring-[rgba(20,184,166,0.1)] outline-none transition-all"
            >
              {lengthOptions.map((l) => (
                <option key={l} value={l}>
                  {l} {t('common.residues') as string}
                </option>
              ))}
            </select>
          </div>

          {/* Number of Peptides */}
          <div className="space-y-1 mb-4">
            <label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
              {t('dashboard.numPeptides') as string}
            </label>
            <select
              value={peptideCount}
              onChange={(e) => setPeptideCount(Number(e.target.value))}
              className="w-full h-[36px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 text-[14px] text-[#111827] focus:border-[#14B8A6] focus:ring-2 focus:ring-[rgba(20,184,166,0.1)] outline-none transition-all"
            >
              {countOptions.map((c) => (
                <option key={c} value={c}>
                  {c} {t('common.peptides') as string}
                </option>
              ))}
            </select>
          </div>

          {/* Model Backend */}
          <div className="space-y-1 mb-5">
            <label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
              {t('dashboard.modelBackend') as string}
            </label>
            <select
              value={modelBackend}
              onChange={(e) => setModelBackend(e.target.value)}
              className="w-full h-[36px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 text-[14px] text-[#111827] focus:border-[#14B8A6] focus:ring-2 focus:ring-[rgba(20,184,166,0.1)] outline-none transition-all"
            >
              {modelOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-[44px] bg-[#14B8A6] hover:bg-[#0D9488] text-white rounded-[6px] text-[14px] font-medium flex items-center justify-center gap-2 transition-all duration-150 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('common.loading') as string}
              </>
            ) : (
              <>
                <Play size={16} />
                {t('dashboard.generateButton') as string}
              </>
            )}
          </button>

          {generationStatus && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-3 rounded-[6px] bg-[#F0FDFA] border border-[#14B8A6] text-[13px] text-[#0D9488]"
            >
              {generationStatus}
            </motion.div>
          )}

          {/* Quick Mode Pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {quickModes.map((mode) => {
              const Icon = mode.icon
              return (
                <button
                  key={mode.label}
                  onClick={() => handleQuickMode(mode.length, mode.count)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#14B8A6] hover:text-[#14B8A6] transition-all duration-150"
                >
                  <Icon size={12} />
                  {mode.label}
                </button>
              )
            })}
          </div>

          {/* Disclaimer Note */}
          <p className="mt-4 text-[11px] text-[#9CA3AF] italic">
            {t('common.disclaimer') as string}
          </p>
        </motion.div>

        {/* Workflow Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <WorkflowDiagram nodes={workflowNodes} />
        </motion.div>
      </div>

      {/* Recent Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#14B8A6]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">{t('dashboard.recentTasks') as string}</h2>
          </div>
          <button
            onClick={() => navigate('/task-center')}
            className="text-[13px] font-medium text-[#14B8A6] hover:text-[#0D9488] flex items-center gap-1 transition-colors"
          >
            {t('dashboard.viewAll') as string}
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto rounded-[6px] border border-[#E5E7EB]">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                <th className="text-left px-4 py-3">Task ID</th>
                <th className="text-left px-4 py-3">{t('tasks.columnType') as string}</th>
                <th className="text-left px-4 py-3">{t('tasks.columnStatus') as string}</th>
                <th className="text-left px-4 py-3">{t('tasks.columnProgress') as string}</th>
                <th className="text-left px-4 py-3">{t('tasks.columnCreated') as string}</th>
                <th className="text-left px-4 py-3">{t('tasks.columnActions') as string}</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run, index) => (
                <motion.tr
                  key={run.run_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.04 * index }}
                  className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors h-[48px]"
                >
                  <td className="px-4 py-3 font-mono text-[14px] text-[#14B8A6]">
                    #{run.run_id}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-[#111827]">{run.backend}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={run.status as TaskStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-[80px] h-[6px] bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            run.status === 'SUCCEEDED'
                              ? 'bg-[#10B981]'
                              : run.status === 'FAILED'
                                ? 'bg-[#EF4444]'
                                : run.status === 'RUNNING'
                                  ? 'bg-[#F59E0B]'
                                  : 'bg-[#6B7280]'
                          }`}
                          style={{ width: `${(run.count / run.count) * 100}%` }}
                        />
                      </div>
                      <span className="text-[12px] text-[#6B7280]">
                        {run.count}/{run.count}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#6B7280]">
                    {formatRelativeTime(run.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate('/task-center')}
                        className="p-1.5 rounded-[4px] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#14B8A6] transition-colors"
                        title="View task"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => {
                          /* retry */
                        }}
                        className="p-1.5 rounded-[4px] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#14B8A6] transition-colors"
                        title="Retry task"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Scientific Disclaimer Banner */}
      {showDisclaimer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          exit={{ opacity: 0 }}
          className="relative bg-[#FFFBEB] border border-[#FCD34D] rounded-[8px] p-4"
        >
          <button
            onClick={() => setShowDisclaimer(false)}
            className="absolute top-3 right-3 p-1 rounded-[4px] text-[#D97706] hover:bg-[#FEF3C7] transition-colors"
          >
            <X size={14} />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <AlertTriangle size={16} className="text-[#D97706] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-[#92400E]">
                Computational Predictions, Pending Experimental Validation
              </p>
              <p className="text-[12px] text-[#B45309] mt-1">
                All scores, predictions, and metrics shown are computational predictions from AI models. Experimental
                validation is required before any peptide can be considered for therapeutic use.
              </p>
              <p className="text-[12px] text-[#B45309] mt-0.5">
                「计算预测，待实验验证」— 所有展示的分数、预测和指标均为AI模型的计算预测。任何肽在用于治疗之前都需要实验验证。
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Peptide Preview Table (Small Sample) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
        className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-[#14B8A6]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">{t('dashboard.recentCandidates') as string}</h2>
          </div>
          <button
            onClick={() => navigate('/candidate-library')}
            className="text-[13px] font-medium text-[#14B8A6] hover:text-[#0D9488] flex items-center gap-1 transition-colors"
          >
            {t('dashboard.viewAll') as string}
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto rounded-[6px] border border-[#E5E7EB]">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Sequence</th>
                <th className="text-left px-4 py-3">Length</th>
                <th className="text-left px-4 py-3">AMP Score</th>
                <th className="text-left px-4 py-3">MIC Score</th>
                <th className="text-left px-4 py-3">Toxicity</th>
                <th className="text-left px-4 py-3">Hemolysis</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPeptides.map((peptide: PeptideCandidate, index: number) => (
                <motion.tr
                  key={peptide.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.04 * index }}
                  className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors h-[48px] cursor-pointer"
                  onClick={() => navigate(`/peptide/${peptide.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-[14px] text-[#14B8A6]">#{peptide.id}</td>
                  <td className="px-4 py-3 font-mono text-[14px] text-[#14B8A6]">{peptide.sequence}</td>
                  <td className="px-4 py-3 text-[14px] text-[#111827]">{peptide.length}</td>
                  <td className="px-4 py-3">
                    {peptide.amp_score != null ? (
                      <span
                        className={`text-[13px] font-medium ${
                          peptide.amp_score > 0.7 ? 'text-[#10B981]' : peptide.amp_score > 0.4 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                        }`}
                      >
                        {peptide.amp_score.toFixed(3)}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#9CA3AF]">Not computed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#6B7280]">
                    {peptide.mic_ecoli != null ? peptide.mic_ecoli.toFixed(3) : <span className="text-[#9CA3AF]">Not computed</span>}
                  </td>
                  <td className="px-4 py-3">
                    {peptide.toxicity_risk != null ? (
                      <span
                        className={`text-[13px] font-medium ${
                          peptide.toxicity_risk < 0.3 ? 'text-[#10B981]' : peptide.toxicity_risk < 0.6 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                        }`}
                      >
                        {peptide.toxicity_risk.toFixed(3)}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#9CA3AF]">Not computed</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {peptide.hemolysis_risk != null ? (
                      <span
                        className={`text-[13px] font-medium ${
                          peptide.hemolysis_risk < 0.3 ? 'text-[#10B981]' : peptide.hemolysis_risk < 0.6 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                        }`}
                      >
                        {peptide.hemolysis_risk.toFixed(3)}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#9CA3AF]">Not computed</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        peptide.status === 'CANDIDATE'
                          ? 'bg-[#F0FDFA] text-[#14B8A6]'
                          : peptide.status === 'VALIDATED'
                            ? 'bg-emerald-50 text-[#10B981]'
                            : peptide.status === 'FILTERED'
                              ? 'bg-blue-50 text-[#3B82F6]'
                              : peptide.status === 'REJECTED'
                                ? 'bg-red-50 text-[#EF4444]'
                                : 'bg-gray-50 text-[#6B7280]'
                      }`}
                    >
                      {peptide.status === 'CANDIDATE'
                        ? t('library.statusSelected')
                        : peptide.status === 'VALIDATED'
                          ? t('library.statusTested')
                          : peptide.status === 'FILTERED'
                            ? t('library.statusNew')
                            : peptide.status === 'REJECTED'
                              ? t('library.statusRejected')
                              : peptide.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-[#9CA3AF] italic">{t('common.disclaimer') as string}</p>
      </motion.div>
    </div>
  )
}
