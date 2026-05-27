import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import {
  GitCompare, AlertTriangle, BarChart3, CheckCircle, X, Cpu,
} from 'lucide-react'
import {
  getGenerationRunsSummary,
  compareGenerationRuns,
} from '@/api/analytics'
import type { GenerationRunSummaryItem, RunCompareItem } from '@/api/analytics'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function LoadingCard() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-5 h-[200px] flex items-center justify-center">
      <div className="inline-block w-6 h-6 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-[#FECACA] rounded-[8px] p-5 text-[13px] text-[#DC2626]">
      {message}
    </div>
  )
}

const RUN_COLORS = ['#14B8A6', '#F59E0B', '#8B5CF6', '#EF4444']

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function RunSelector({
  runs,
  selected,
  onToggle,
}: {
  runs: GenerationRunSummaryItem[]
  selected: number[]
  onToggle: (id: number) => void
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
      <h3 className="text-[14px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
        <CheckCircle size={14} className="text-[#14B8A6]" />
        Select Runs to Compare <span className="text-[#6B7280] font-normal">(2–4)</span>
      </h3>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {runs.map((run) => {
          const isSelected = selected.includes(run.id)
          return (
            <button
              key={run.id}
              onClick={() => onToggle(run.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-left transition-colors ${
                isSelected
                  ? 'bg-[#F0FDFA] border border-[#14B8A6]'
                  : 'hover:bg-[#F9FAFB] border border-transparent'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-[4px] border flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-[#14B8A6] border-[#14B8A6]' : 'border-[#D1D5DB] bg-white'
                }`}
              >
                {isSelected && <CheckCircle size={12} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="font-mono font-medium text-[#111827]">Run #{run.id}</span>
                  <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium border bg-gray-50 text-gray-600 border-gray-200">
                    {run.backend || '—'}
                  </span>
                  <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${
                    run.status === 'SUCCEEDED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    run.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-200' :
                    run.status === 'RUNNING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {run.status}
                  </span>
                </div>
                <div className="text-[12px] text-[#6B7280] mt-0.5">
                  {run.mode || '—'} · {run.count} peptides · {formatDate(run.created_at)}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ComparisonTable({ compared }: { compared: RunCompareItem[] }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">Metric</th>
              {compared.map((c, idx) => (
                <th key={c.run_id} className="text-center px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: RUN_COLORS[idx % RUN_COLORS.length] }} />
                    <span className="text-[12px] font-semibold text-[#111827]">Run #{c.run_id}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Backend', getter: (c: RunCompareItem) => c.run_info.backend || '—' },
              { label: 'Mode', getter: (c: RunCompareItem) => c.run_info.mode || '—' },
              { label: 'Status', getter: (c: RunCompareItem) => c.run_info.status },
              { label: 'Total Peptides', getter: (c: RunCompareItem) => c.total_peptides },
              { label: 'Avg Length', getter: (c: RunCompareItem) => c.avg_length ?? '—' },
              { label: 'Avg Net Charge', getter: (c: RunCompareItem) => c.avg_net_charge ?? '—' },
              { label: 'Avg Hydrophobic Fraction', getter: (c: RunCompareItem) => c.avg_hydrophobic_fraction ?? '—' },
              { label: 'Candidates', getter: (c: RunCompareItem) => c.candidate_count },
              { label: 'Filtered', getter: (c: RunCompareItem) => c.filtered_count },
              { label: 'Rejected', getter: (c: RunCompareItem) => c.rejected_count },
            ].map((row) => (
              <tr key={row.label} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                <td className="px-4 py-2.5 font-medium text-[#111827]">{row.label}</td>
                {compared.map((c) => (
                  <td key={`${c.run_id}-${row.label}`} className="text-center px-4 py-2.5 text-[#374151]">
                    {row.getter(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LengthDistributionChart({ compared }: { compared: RunCompareItem[] }) {
  const bins = ['10-14', '15-19', '20-24', '25-29', '30-35', '>35']
  const data = bins.map((bin) => {
    const row: Record<string, string | number> = { bin }
    compared.forEach((c) => {
      const found = c.length_distribution.find((d) => d.bin === bin)
      row[`run${c.run_id}`] = found?.count ?? 0
    })
    return row
  })

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
      <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Length Distribution Comparison</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
          {compared.map((c, i) => (
            <Bar
              key={c.run_id}
              dataKey={`run${c.run_id}`}
              name={`Run #${c.run_id}`}
              fill={RUN_COLORS[i % RUN_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function StatusRadarChart({ compared }: { compared: RunCompareItem[] }) {
  // Build radar data: for each status, count per run
  const statuses = ['GENERATED', 'FILTERED', 'CANDIDATE', 'VALIDATED', 'REJECTED']
  const data = statuses.map((status) => {
    const row: Record<string, string | number> = { status }
    compared.forEach((c) => {
      const found = c.status_counts.find((s) => s.status === status)
      row[`run${c.run_id}`] = found?.count ?? 0
    })
    return row
  })

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
      <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Status Distribution Radar</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis dataKey="status" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fontSize: 10 }} />
          {compared.map((c, i) => (
            <Radar
              key={c.run_id}
              name={`Run #${c.run_id}`}
              dataKey={`run${c.run_id}`}
              stroke={RUN_COLORS[i % RUN_COLORS.length]}
              fill={RUN_COLORS[i % RUN_COLORS.length]}
              fillOpacity={0.2}
            />
          ))}
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function StatusStackedChart({ compared }: { compared: RunCompareItem[] }) {
  const statuses = ['GENERATED', 'FILTERED', 'CANDIDATE', 'VALIDATED', 'REJECTED']
  const data = compared.map((c) => {
    const row: Record<string, string | number> = { name: `Run #${c.run_id}` }
    statuses.forEach((s) => {
      row[s] = c.status_counts.find((sc) => sc.status === s)?.count ?? 0
    })
    return row
  })

  const STATUS_COLORS: Record<string, string> = {
    GENERATED: '#9CA3AF',
    FILTERED: '#3B82F6',
    CANDIDATE: '#14B8A6',
    VALIDATED: '#10B981',
    REJECTED: '#EF4444',
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
      <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Status Breakdown by Run</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
          {statuses.map((s) => (
            <Bar key={s} dataKey={s} stackId="a" fill={STATUS_COLORS[s]} radius={[0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function RunComparisonPage() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState<GenerationRunSummaryItem[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [compared, setCompared] = useState<RunCompareItem[] | null>(null)
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [loadingCompare, setLoadingCompare] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoadingRuns(true)
      try {
        const data = await getGenerationRunsSummary()
        setRuns(data.runs)
      } catch (e: any) {
        setError(e.message || 'Failed to load generation runs')
      } finally {
        setLoadingRuns(false)
      }
    }
    load()
  }, [])

  const toggleRun = (id: number) => {
    setCompared(null)
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) return prev
      return [...prev, id]
    })
  }

  const handleCompare = async () => {
    if (selected.length < 2) return
    setLoadingCompare(true)
    setError(null)
    try {
      const data = await compareGenerationRuns(selected)
      setCompared(data.compared_runs)
    } catch (e: any) {
      setError(e.message || 'Comparison failed')
    } finally {
      setLoadingCompare(false)
    }
  }

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
            <GitCompare size={20} className="text-[#14B8A6]" />
          </div>
          <div>
            <h1 className="text-[20px] font-semibold text-[#111827]">Run Comparison</h1>
            <p className="text-[14px] text-[#6B7280]">
              Compare physicochemical properties, length distributions, and status breakdown across 2–4 generation runs side-by-side.
            </p>
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
          Computational prediction only. Not experimentally validated. Comparison is for procedural analysis only, not antimicrobial activity benchmarking.
        </p>
      </motion.div>

      {/* Status badges */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.06 }}
        className="flex flex-wrap gap-2"
      >
        {[
          { text: 'Local Workstation Mode', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
          { text: 'Real database analytics', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { text: '2–4 runs per comparison', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
        ].map((b) => (
          <span key={b.text} className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium border ${b.bg}`}>
            {b.text}
          </span>
        ))}
      </motion.div>

      {/* Selector + Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col lg:flex-row gap-4"
      >
        <div className="flex-1 min-w-0">
          {loadingRuns ? (
            <LoadingCard />
          ) : error && !runs.length ? (
            <ErrorCard message={error} />
          ) : (
            <RunSelector runs={runs} selected={selected} onToggle={toggleRun} />
          )}
        </div>
        <div className="lg:w-[280px] flex-shrink-0">
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
            <h3 className="text-[14px] font-semibold text-[#111827] mb-3">Actions</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#6B7280]">Selected</span>
                <span className="font-semibold text-[#111827]">{selected.length} / 4</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selected.map((id, i) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
                    style={{ backgroundColor: RUN_COLORS[i % RUN_COLORS.length] }}
                  >
                    Run #{id}
                    <button onClick={() => toggleRun(id)} className="hover:opacity-80">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <button
                onClick={handleCompare}
                disabled={selected.length < 2 || loadingCompare}
                className={`w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-[6px] text-[13px] font-medium transition-colors ${
                  selected.length < 2 || loadingCompare
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#14B8A6] text-white hover:bg-[#0D9488]'
                }`}
              >
                {loadingCompare ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Comparing…
                  </>
                ) : (
                  <>
                    <GitCompare size={14} />
                    Compare Runs
                  </>
                )}
              </button>
              {selected.length < 2 && (
                <p className="text-[11px] text-[#9CA3AF] text-center">Select at least 2 runs</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Error */}
      {error && runs.length > 0 && <ErrorCard message={error} />}

      {/* Comparison Results */}
      {compared && compared.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <h2 className="text-[16px] font-semibold text-[#111827] flex items-center gap-2">
            <BarChart3 size={16} className="text-[#14B8A6]" />
            Comparison Results
          </h2>

          {/* Table */}
          <ComparisonTable compared={compared} />

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LengthDistributionChart compared={compared} />
            <StatusRadarChart compared={compared} />
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StatusStackedChart compared={compared} />
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Run Metadata</h3>
              <div className="space-y-3">
                {compared.map((c, i) => (
                  <div key={c.run_id} className="p-3 rounded-[6px] border" style={{ borderColor: RUN_COLORS[i % RUN_COLORS.length] + '40' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: RUN_COLORS[i % RUN_COLORS.length] }} />
                      <span className="text-[13px] font-semibold text-[#111827]">Run #{c.run_id}</span>
                      <span className="text-[11px] text-[#6B7280] ml-auto">{c.run_info.backend || '—'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div><span className="text-[#6B7280]">Mode:</span> {c.run_info.mode || '—'}</div>
                      <div><span className="text-[#6B7280]">Status:</span> {c.run_info.status}</div>
                      <div><span className="text-[#6B7280]">Count:</span> {c.run_info.count}</div>
                      <div><span className="text-[#6B7280]">Peptides:</span> {c.total_peptides}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex flex-wrap items-center gap-3"
      >
        <button
          onClick={() => navigate('/ampgen-workflow')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
        >
          <Cpu size={14} />
          AMPGen Workflow
        </button>
        <button
          onClick={() => navigate('/peptide-analytics')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
        >
          <BarChart3 size={14} />
          Global Peptide Analytics
        </button>
      </motion.div>
    </div>
  )
}
