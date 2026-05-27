import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Workflow, Cpu, Server, AlertTriangle, CheckCircle,
  Zap, Ban, ArrowRight, Activity,
  ChevronRight, Info, BarChart3,
} from 'lucide-react'
import { apiClient } from '@/api/client'
import { getDashboardSummary } from '@/api/dashboard'
import type { DashboardSummary } from '@/api/dashboard'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SystemStatus {
  backend_status: string
  ampgen_root: string
  generator_detected: boolean
  discriminator_detected: boolean
  mic_scorer_detected: boolean
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BACKEND_CARDS = [
  {
    key: 'LOCAL_DEMO',
    title: 'LOCAL_DEMO',
    purpose: '流程演示',
    countLimit: 5,
    speed: '秒级',
    result: 'Demo sequence only',
    scores: 'Not computed',
    icon: Zap,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    iconColor: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'LOCAL_REAL_SMOKE',
    title: 'LOCAL_REAL_SMOKE',
    purpose: '本机真实 AMPGen 小规模验证',
    countLimit: 2,
    speed: '约 45–60 秒',
    result: '真实 AMPGen sequence generation',
    scores: 'Not computed',
    icon: Cpu,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    iconColor: 'text-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    key: 'SERVER_PRODUCTION',
    title: 'SERVER_PRODUCTION',
    purpose: '服务器生产计算预留',
    countLimit: '—',
    speed: '—',
    result: 'Not connected / BLOCKED',
    scores: '—',
    icon: Server,
    color: 'bg-gray-50 border-gray-200 text-gray-500',
    iconColor: 'text-gray-400',
    badge: 'bg-gray-100 text-gray-500',
  },
]

const WORKFLOW_STEPS = [
  {
    step: 1,
    name: 'Select backend mode',
    description: 'Choose LOCAL_DEMO, LOCAL_REAL_SMOKE, or SERVER_PRODUCTION',
    api: 'POST /api/v1/generation-runs',
    page: 'Generation',
    status: 'available' as const,
  },
  {
    step: 2,
    name: 'Submit generation run',
    description: 'Configure mode, count, length range, temperature, top-p',
    api: 'POST /api/v1/generation-runs',
    page: 'Generation',
    status: 'available' as const,
  },
  {
    step: 3,
    name: 'Create task',
    description: 'Backend creates a background task with PENDING status',
    api: 'Task model auto-created',
    page: 'Task Center',
    status: 'available' as const,
  },
  {
    step: 4,
    name: 'Run AMPGen / demo runner',
    description: 'Background thread executes the runner for the chosen backend',
    api: 'Background runner (threading)',
    page: 'Task Center',
    status: 'available' as const,
  },
  {
    step: 5,
    name: 'Capture stdout/stderr',
    description: 'Runner logs are written to artifact_dir/stdout.log and stderr.log',
    api: 'GET /api/v1/tasks/{id}/logs',
    page: 'Task Center / Run Detail',
    status: 'available' as const,
  },
  {
    step: 6,
    name: 'Save CSV/FASTA artifacts',
    description: 'Generated sequences exported to generated_sequences.csv and .fasta',
    api: 'GET /api/v1/generation-runs/{id}/artifacts',
    page: 'Run Detail',
    status: 'available' as const,
  },
  {
    step: 7,
    name: 'Insert peptides into SQLite',
    description: 'Peptide candidates saved to local SQLite with null scores',
    api: 'GET /api/v1/peptides',
    page: 'Candidate Library',
    status: 'available' as const,
  },
  {
    step: 8,
    name: 'View Candidate Library',
    description: 'Browse, filter, sort, and export generated sequences',
    api: 'GET /api/v1/peptides',
    page: 'Candidate Library',
    status: 'available' as const,
  },
  {
    step: 9,
    name: 'Export / validation planning',
    description: 'Export CSV/FASTA/JSON/Markdown reports; plan experimental validation',
    api: 'GET /api/v1/reports/*',
    page: 'Report Export',
    status: 'available' as const,
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function StatusDot({ status }: { status: 'available' | 'planned' | 'blocked' }) {
  const map = {
    available: { bg: 'bg-emerald-500', label: 'Available' },
    planned: { bg: 'bg-amber-500', label: 'Planned' },
    blocked: { bg: 'bg-red-500', label: 'Blocked' },
  }
  const s = map[status]
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#6B7280]">
      <span className={`w-2 h-2 rounded-full ${s.bg}`} />
      {s.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AMPGenWorkflowPage() {
  const navigate = useNavigate()
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [health, probe, dash] = await Promise.allSettled([
          apiClient.get('/health'),
          apiClient.get('/v1/system/ampgen-probe'),
          getDashboardSummary(),
        ])

        if (probe.status === 'fulfilled') {
          const p = probe.value as any
          setSystemStatus({
            backend_status: health.status === 'fulfilled' ? 'online' : 'unavailable',
            ampgen_root: p.ampgen_root || 'N/A',
            generator_detected: !!p.generator_detected,
            discriminator_detected: !!p.discriminator_detected,
            mic_scorer_detected: !!p.mic_scorer_detected,
          })
        }

        if (dash.status === 'fulfilled') {
          setDashboard(dash.value)
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load system status')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[#F0FDFA] flex items-center justify-center">
            <Workflow size={20} className="text-[#14B8A6]" />
          </div>
          <div>
            <h1 className="text-[20px] font-semibold text-[#111827]">AMPGen Workflow Visualizer</h1>
            <p className="text-[14px] text-[#6B7280] mt-0.5">
              Visualize how AMPGen generates, stores, filters, and tracks antimicrobial peptide candidates.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Scientific Boundary Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="p-4 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-3"
      >
        <AlertTriangle size={16} className="text-[#DC2626] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[13px] font-medium text-[#991B1B]">
            Computational prediction only. Not experimentally validated.
          </p>
          <p className="text-[12px] text-[#B91C1C] mt-0.5">
            LOCAL_REAL_SMOKE verifies sequence generation only, not antimicrobial activity.
          </p>
        </div>
      </motion.div>

      {/* Backend Mode Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
          <Cpu size={16} className="text-[#14B8A6]" />
          Backend Modes
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {BACKEND_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.key}
                className={`rounded-[8px] border p-4 ${card.color}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={18} className={card.iconColor} />
                  <span className="text-[14px] font-semibold">{card.title}</span>
                </div>
                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="opacity-70">用途</span>
                    <span className="font-medium">{card.purpose}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Count 上限</span>
                    <span className="font-medium">{card.countLimit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">速度</span>
                    <span className="font-medium">{card.speed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">结果</span>
                    <span className="font-medium">{card.result}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">AMP / MIC</span>
                    <span className="font-medium">{card.scores}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${card.badge}`}>
                    {card.key === 'SERVER_PRODUCTION' ? 'BLOCKED' : 'ACTIVE'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Workflow Steps */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
          <ArrowRight size={16} className="text-[#14B8A6]" />
          AMPGen Workflow Steps
        </h2>
        <div className="bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden">
          {WORKFLOW_STEPS.map((step, idx) => (
            <div
              key={step.step}
              className={`flex items-start gap-4 p-4 ${idx !== WORKFLOW_STEPS.length - 1 ? 'border-b border-[#E5E7EB]' : ''} hover:bg-[#F9FAFB] transition-colors`}
            >
              <div className="w-8 h-8 rounded-full bg-[#F0FDFA] border border-[#14B8A6] flex items-center justify-center flex-shrink-0">
                <span className="text-[13px] font-bold text-[#14B8A6]">{step.step}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[14px] font-semibold text-[#111827]">{step.name}</span>
                  <StatusDot status={step.status} />
                </div>
                <p className="text-[13px] text-[#6B7280] mb-1.5">{step.description}</p>
                <div className="flex items-center gap-4 text-[12px]">
                  <span className="inline-flex items-center gap-1 text-[#14B8A6]">
                    <Info size={11} />
                    {step.api}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#6B7280]">
                    <ChevronRight size={11} />
                    {step.page}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* System Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
          <Activity size={16} className="text-[#14B8A6]" />
          Current System Status
        </h2>
        {loading ? (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-[13px] text-[#6B7280]">Loading system status...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-[#FECACA] rounded-[8px] p-4 text-[13px] text-[#DC2626]">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Status Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Backend</h3>
              <div className="space-y-2.5 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Status</span>
                  <span className={`font-medium ${systemStatus?.backend_status === 'online' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {systemStatus?.backend_status === 'online' ? 'Online' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">AMPGEN_ROOT</span>
                  <span className="font-mono text-[#111827] text-[12px]">{systemStatus?.ampgen_root || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Components Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">AMPGen Components</h3>
              <div className="space-y-2.5 text-[13px]">
                {[
                  { label: 'AMP Generator', detected: systemStatus?.generator_detected },
                  { label: 'AMP Discriminator', detected: systemStatus?.discriminator_detected },
                  { label: 'MIC Scorer', detected: systemStatus?.mic_scorer_detected },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-[#6B7280]">{item.label}</span>
                    {item.detected ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle size={12} /> Detected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400 font-medium">
                        <Ban size={12} /> Not detected
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Database Stats</h3>
              <div className="space-y-2.5 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Total Peptides</span>
                  <span className="font-medium text-[#111827]">{dashboard?.peptides_total ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Total Tasks</span>
                  <span className="font-medium text-[#111827]">{dashboard?.tasks_total ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Generation Runs</span>
                  <span className="font-medium text-[#111827]">{dashboard?.generation_runs_total ?? '—'}</span>
                </div>
              </div>
            </div>

            {/* Server Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Server Production</h3>
              <div className="flex items-center gap-2 text-[13px] text-gray-400">
                <Server size={14} />
                <span>Not connected</span>
              </div>
              <p className="text-[12px] text-[#9CA3AF] mt-2">
                Server backend is reserved for future large-scale production deployment.
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Analytics Link */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.24 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => navigate('/peptide-analytics')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#14B8A6] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#0D9488] transition-colors"
        >
          <BarChart3 size={14} />
          View Peptide Analytics
        </button>
        <span className="text-[12px] text-[#6B7280]">
          After generation, inspect physicochemical distributions of generated peptide candidates.
        </span>
      </motion.div>

      {/* Scientific Boundary Footer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="p-4 rounded-[8px] bg-[#F0FDFA] border border-[#14B8A6]"
      >
        <p className="text-[12px] text-[#0F766E] flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            <strong>Scientific Boundary:</strong> Sequence generation ≠ experimentally validated antimicrobial activity.
            All scores shown as "Not computed" are intentionally null. Do not interpret generated sequences as proven AMPs
            without wet-lab validation.
          </span>
        </p>
      </motion.div>
    </div>
  )
}
