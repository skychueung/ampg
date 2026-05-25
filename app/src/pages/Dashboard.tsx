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
} from 'lucide-react'
import StatCard from '@/components/StatCard'
import WorkflowDiagram from '@/components/WorkflowDiagram'
import StatusBadge from '@/components/StatusBadge'
import {
  DEMO_PEPTIDES,
  countByStatus,
  formatRelativeTime,
  getRecentTasks,
  createTask,
} from '@/data/demoData'
import type { PeptideCandidate } from '@/data/demoData'

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
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
  const [recentTasks, setRecentTasks] = useState(getRecentTasks(5))

  const stats = countByStatus()

  // Refresh tasks periodically for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentTasks(getRecentTasks(5))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleGenerate = () => {
    setIsGenerating(true)
    setGenerationStatus('Initializing generation pipeline...')

    // Simulate generation steps
    setTimeout(() => {
      setGenerationStatus('Loading model (AMPGen-Demo)...')
    }, 600)
    setTimeout(() => {
      setGenerationStatus(`Generating ${peptideCount} peptides (length ${peptideLength})...`)
    }, 1200)
    setTimeout(() => {
      const task = createTask(
        generationMode === 'Generate' ? 'AMP Generation' : 'AMP Refinement',
        peptideCount
      )
      setGenerationStatus(`Task #${task.id} started successfully!`)
      setRecentTasks(getRecentTasks(5))
    }, 2500)
    setTimeout(() => {
      setIsGenerating(false)
      setGenerationStatus('')
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

  // Demo workflow nodes for the diagram
  const workflowNodes = [
    { id: 'data-input', label: t('workflow.dataInput') as string, icon: Database, state: 'completed' as const },
    { id: 'amp-generation', label: t('workflow.ampGeneration') as string, icon: FlaskConical, state: 'active' as const },
    { id: 'physicochemical', label: t('workflow.physicochemicalFilter') as string, icon: Filter, state: 'pending' as const },
    { id: 'discriminator', label: t('workflow.ampDiscriminator') as string, icon: Search, state: 'pending' as const },
    { id: 'mic-scoring', label: t('workflow.micScoring') as string, icon: Database, state: 'pending' as const },
    { id: 'candidate-lib', label: t('workflow.candidateLibrary') as string, icon: Beaker, state: 'pending' as const },
    { id: 'validation', label: t('workflow.experimentalValidation') as string, icon: Microscope, state: 'pending' as const },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-[20px] font-semibold text-[#111827]">{t('dashboard.title') as string}</h1>
        <p className="text-[14px] text-[#6B7280] mt-1">
          {t('dashboard.subtitle') as string}
        </p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-4 gap-4"
      >
        <StatCard
          icon={<Database size={18} />}
          value={stats.GENERATED}
          label={t('dashboard.statGenerated') as string}
          color="teal"
          delay={0}
        />
        <StatCard
          icon={<CheckCircle size={18} />}
          value={stats.FILTERED}
          label={t('dashboard.statPassed') as string}
          color="green"
          delay={80}
        />
        <StatCard
          icon={<Beaker size={18} />}
          value={stats.CANDIDATE}
          label={t('dashboard.statCandidates') as string}
          color="teal"
          delay={160}
        />
        <StatCard
          icon={<Clock size={18} />}
          value={stats.VALIDATED}
          label={t('dashboard.statPending') as string}
          color="amber"
          delay={240}
        />
      </motion.div>

      {/* Two-Column: Generation Form + Workflow */}
      <div className="grid grid-cols-2 gap-6">
        {/* Generation Form */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
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
          <div className="flex gap-2 mt-4">
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
          transition={{ duration: 0.3, delay: 0.3 }}
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                <th className="text-left px-4 py-3 rounded-tl-[6px]">Task ID</th>
                <th className="text-left px-4 py-3">{t('tasks.columnType') as string}</th>
                <th className="text-left px-4 py-3">{t('tasks.columnStatus') as string}</th>
                <th className="text-left px-4 py-3">{t('tasks.columnProgress') as string}</th>
                <th className="text-left px-4 py-3">{t('tasks.columnCreated') as string}</th>
                <th className="text-left px-4 py-3 rounded-tr-[6px]">{t('tasks.columnActions') as string}</th>
              </tr>
            </thead>
            <tbody>
              {recentTasks.map((task, index) => (
                <motion.tr
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.04 * index }}
                  className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors h-[48px]"
                >
                  <td className="px-4 py-3 font-mono text-[14px] text-[#14B8A6]">
                    #{task.id}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-[#111827]">{task.type === 'AMP Generation' ? t('tasks.typeGeneration') : task.type === 'Physicochemical Filter' ? t('tasks.typeFiltering') : task.type === 'AMP Discriminator' ? t('tasks.typeDiscriminator') : task.type === 'MIC Scoring' ? t('tasks.typeScoring') : task.type as string}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-[80px] h-[6px] bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            task.status === 'SUCCEEDED'
                              ? 'bg-[#10B981]'
                              : task.status === 'FAILED'
                                ? 'bg-[#EF4444]'
                                : task.status === 'RUNNING'
                                  ? 'bg-[#F59E0B]'
                                  : 'bg-[#6B7280]'
                          }`}
                          style={{ width: `${(task.progress / task.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-[12px] text-[#6B7280]">
                        {task.progress}/{task.total}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#6B7280]">
                    {formatRelativeTime(task.createdAt)}
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
                Demo Data, Not experimentally validated
              </p>
              <p className="text-[12px] text-[#B45309] mt-1">
                All scores, predictions, and metrics shown are computational predictions from AI models. Experimental
                validation is required before any peptide can be considered for therapeutic use.
              </p>
              <p className="text-[12px] text-[#B45309] mt-0.5">
                「演示数据，未经实验验证」— 所有展示的分数、预测和指标均为AI模型的计算预测。任何肽在用于治疗之前都需要实验验证。
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                <th className="text-left px-4 py-3 rounded-tl-[6px]">ID</th>
                <th className="text-left px-4 py-3">Sequence</th>
                <th className="text-left px-4 py-3">Length</th>
                <th className="text-left px-4 py-3">AMP Score</th>
                <th className="text-left px-4 py-3">MIC Score</th>
                <th className="text-left px-4 py-3">Toxicity</th>
                <th className="text-left px-4 py-3">Hemolysis</th>
                <th className="text-left px-4 py-3 rounded-tr-[6px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_PEPTIDES.slice(0, 6).map((peptide: PeptideCandidate, index: number) => (
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
                    <span
                      className={`text-[13px] font-medium ${
                        peptide.ampScore > 0.7 ? 'text-[#10B981]' : peptide.ampScore > 0.4 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                      }`}
                    >
                      {peptide.ampScore.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#6B7280]">{peptide.micScore.toFixed(3)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[13px] font-medium ${
                        peptide.toxicityRisk < 0.3 ? 'text-[#10B981]' : peptide.toxicityRisk < 0.6 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                      }`}
                    >
                      {peptide.toxicityRisk.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[13px] font-medium ${
                        peptide.hemolysisRisk < 0.3 ? 'text-[#10B981]' : peptide.hemolysisRisk < 0.6 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                      }`}
                    >
                      {peptide.hemolysisRisk.toFixed(3)}
                    </span>
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
                      {peptide.status === 'CANDIDATE' ? t('library.statusSelected') : peptide.status === 'VALIDATED' ? t('library.statusTested') : peptide.status === 'FILTERED' ? t('library.statusNew') : peptide.status === 'REJECTED' ? t('library.statusRejected') : peptide.status}
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
