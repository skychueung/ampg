import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  BarChart3, AlertTriangle, Dna, FlaskConical, Beaker,
  TrendingUp, CheckCircle, XCircle, Activity, ChevronRight,
  X,
} from 'lucide-react'
import {
  getPeptidesSummary,
  getPropertyDistributions,
  getAminoAcidComposition,
  getStatusSourceBreakdown,
  getFilterRulePassRate,
  getTopCandidates,
} from '@/api/analytics'
import type {
  PeptideSummary,
  PropertyDistributions,
  AminoAcidComposition,
  StatusSourceBreakdown,
  FilterRulePassRate,
  TopCandidates,
} from '@/api/analytics'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, string> = {
  GENERATED: '#9CA3AF',
  FILTERED: '#3B82F6',
  CANDIDATE: '#14B8A6',
  VALIDATED: '#10B981',
  REJECTED: '#EF4444',
}

const SOURCE_COLORS = ['#3B82F6', '#10B981', '#9CA3AF']

const AA_COLORS = [
  '#14B8A6', '#0D9488', '#10B981', '#059669', '#34D399',
  '#6EE7B7', '#A7F3D0', '#047857', '#065F46', '#047857',
  '#059669', '#10B981', '#34D399', '#6EE7B7', '#14B8A6',
  '#0D9488', '#10B981', '#059669', '#34D399', '#6EE7B7',
]

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

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <div className="text-[24px] font-bold text-[#111827]">{value}</div>
      <div className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mt-0.5">{label}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PeptideAnalyticsPage() {
  const [summary, setSummary] = useState<PeptideSummary | null>(null)
  const [distributions, setDistributions] = useState<PropertyDistributions | null>(null)
  const [aaComp, setAaComp] = useState<AminoAcidComposition | null>(null)
  const [breakdown, setBreakdown] = useState<StatusSourceBreakdown | null>(null)
  const [filterRules, setFilterRules] = useState<FilterRulePassRate | null>(null)
  const [topCands, setTopCands] = useState<TopCandidates | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<TopCandidates['candidates'][0] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [s, d, a, b, f, t] = await Promise.all([
          getPeptidesSummary(),
          getPropertyDistributions(),
          getAminoAcidComposition(),
          getStatusSourceBreakdown(),
          getFilterRulePassRate(),
          getTopCandidates(10),
        ])
        setSummary(s)
        setDistributions(d)
        setAaComp(a)
        setBreakdown(b)
        setFilterRules(f)
        setTopCands(t)
      } catch (e: any) {
        setError(e.message || 'Failed to load analytics data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-[20px] font-semibold text-[#111827]">Peptide Analytics</h1>
        <ErrorCard message={error} />
      </div>
    )
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
            <BarChart3 size={20} className="text-[#14B8A6]" />
          </div>
          <div>
            <h1 className="text-[20px] font-semibold text-[#111827]">Peptide Analytics</h1>
            <p className="text-[14px] text-[#6B7280]">
              Explore length, charge, hydrophobicity, amino acid composition, and rule-based filtering of generated AMP candidates.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Status badges */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex flex-wrap gap-2"
      >
        {[
          { text: 'Local Workstation Mode', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
          { text: 'Real database analytics', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { text: 'Computational prediction only', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
          { text: 'AMP score: Not computed', bg: 'bg-gray-50 text-gray-500 border-gray-200' },
          { text: 'MIC: Not computed', bg: 'bg-gray-50 text-gray-500 border-gray-200' },
        ].map((b) => (
          <span key={b.text} className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium border ${b.bg}`}>
            {b.text}
          </span>
        ))}
      </motion.div>

      {/* Scientific Boundary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.06 }}
        className="p-3 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-3"
      >
        <AlertTriangle size={14} className="text-[#DC2626] mt-0.5 flex-shrink-0" />
        <p className="text-[12px] text-[#991B1B]">
          Computational prediction only. Not experimentally validated. Rule-based ranking is heuristic only, not a model prediction.
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
          <Activity size={16} className="text-[#14B8A6]" />
          Summary
        </h2>
        {loading || !summary ? (
          <div className="grid grid-cols-4 gap-4">
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Peptides" value={summary.total_peptides} icon={Dna} color="bg-[#14B8A6]" />
            <StatCard label="Candidates" value={summary.candidate_count} icon={CheckCircle} color="bg-emerald-500" />
            <StatCard label="Local Demo" value={summary.local_demo_count} icon={FlaskConical} color="bg-blue-500" />
            <StatCard label="Local Real Smoke" value={summary.local_real_smoke_count} icon={Beaker} color="bg-emerald-600" />
            <StatCard label="Avg Length" value={summary.average_length ?? '—'} icon={TrendingUp} color="bg-[#6B7280]" />
            <StatCard label="Avg Net Charge" value={summary.average_net_charge ?? '—'} icon={Activity} color="bg-[#F59E0B]" />
            <StatCard label="Avg Hydrophobic Frac" value={summary.average_hydrophobic_fraction ?? '—'} icon={BarChart3} color="bg-[#8B5CF6]" />
            <StatCard label="Not Computed AMP" value={summary.not_computed_amp_score_count} icon={XCircle} color="bg-gray-400" />
          </div>
        )}
      </motion.div>

      {/* Distribution Charts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
          <BarChart3 size={16} className="text-[#14B8A6]" />
          Property Distributions
        </h2>
        {loading || !distributions ? (
          <div className="grid grid-cols-3 gap-4">
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {/* Length */}
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Length Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={distributions.length_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Bar dataKey="count" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Charge */}
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Net Charge Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={distributions.charge_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Hydrophobic */}
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Hydrophobic Fraction Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={distributions.hydrophobic_fraction_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </motion.div>

      {/* Amino Acid Composition */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
          <Dna size={16} className="text-[#14B8A6]" />
          Amino Acid Composition
        </h2>
        {loading || !aaComp ? (
          <LoadingCard />
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] text-[#6B7280]">
                Total residues: <strong>{aaComp.total_residues}</strong>
                {aaComp.invalid_residues > 0 && (
                  <span className="text-red-500 ml-2">Invalid: {aaComp.invalid_residues}</span>
                )}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={aaComp.composition}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="aa" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                  formatter={(value: number, _name: string, props: any) => {
                    const count = props?.payload?.count ?? 0
                    return [`${value} (${count} residues)`, 'Frequency']
                  }}
                />
                <Bar dataKey="frequency" radius={[4, 4, 0, 0]}>
                  {aaComp.composition.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={AA_COLORS[i % AA_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* Status / Source / Backend Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
          <Activity size={16} className="text-[#14B8A6]" />
          Status & Source Breakdown
        </h2>
        {loading || !breakdown ? (
          <div className="grid grid-cols-3 gap-4">
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {/* Status */}
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Status</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={breakdown.status_counts}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ status, count }) => `${status}: ${count}`}
                    labelLine={false}
                  >
                    {breakdown.status_counts.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={STATUS_COLORS[entry.status] || '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Source */}
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Source</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={breakdown.source_counts}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ source, count }) => `${source}: ${count}`}
                    labelLine={false}
                  >
                    {breakdown.source_counts.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Backend */}
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Backend</h3>
              <div className="space-y-2">
                {breakdown.backend_counts.map((b) => (
                  <div key={b.backend} className="flex items-center justify-between text-[13px]">
                    <span className="text-[#6B7280]">{b.backend}</span>
                    <span className="font-semibold text-[#111827]">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Filter Rule Pass Rate */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
          <CheckCircle size={16} className="text-[#14B8A6]" />
          Filter Rule Pass Rate
        </h2>
        {loading || !filterRules ? (
          <LoadingCard />
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4 space-y-4">
            {filterRules.rules.map((rule) => {
              const total = rule.passed + rule.failed
              const pct = total > 0 ? Math.round((rule.passed / total) * 100) : 0
              return (
                <div key={rule.rule}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-medium text-[#111827]">{rule.label}</span>
                    <span className="text-[12px] text-[#6B7280]">
                      {rule.passed}/{total} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#14B8A6] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Top Rule-Based Candidates */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-[#14B8A6]" />
          Top Rule-Based Candidates
        </h2>
        <p className="text-[12px] text-[#9CA3AF] mb-3">
          Rule-based ranking only. Not a model prediction. AMP score and MIC are not computed.
        </p>
        {loading || !topCands ? (
          <LoadingCard />
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    <th className="text-left px-3 py-2.5">Rank</th>
                    <th className="text-left px-3 py-2.5">Sequence</th>
                    <th className="text-center px-3 py-2.5">Length</th>
                    <th className="text-center px-3 py-2.5">Net Charge</th>
                    <th className="text-center px-3 py-2.5">Hydrophobic Frac</th>
                    <th className="text-center px-3 py-2.5">Status</th>
                    <th className="text-center px-3 py-2.5">Source</th>
                    <th className="text-left px-3 py-2.5">Rule-Based Reason</th>
                    <th className="text-center px-3 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {topCands.candidates.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                      onClick={() => setSelectedCandidate(c)}
                    >
                      <td className="px-3 py-2.5 text-[13px] font-bold text-[#14B8A6]">#{c.rule_based_rank}</td>
                      <td className="px-3 py-2.5 font-mono text-[13px] text-[#14B8A6]">{c.sequence}</td>
                      <td className="px-3 py-2.5 text-center text-[13px] text-[#111827]">{c.length}</td>
                      <td className="px-3 py-2.5 text-center text-[13px] text-[#111827]">
                        {c.net_charge != null ? `${c.net_charge > 0 ? '+' : ''}${c.net_charge.toFixed(1)}` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center text-[13px] text-[#111827]">
                        {c.hydrophobic_fraction != null ? c.hydrophobic_fraction.toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F0FDFA] text-[#14B8A6] border border-[#14B8A6]">
                          {c.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-[12px] text-[#6B7280]">
                        {c.source === 'local_demo' ? 'Demo' : c.source === 'local_real_smoke' ? 'Real' : (c.source || '—')}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-[#6B7280] max-w-[200px] truncate">{c.rule_based_reason}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button className="p-1 rounded text-[#6B7280] hover:text-[#14B8A6] transition-colors">
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* Candidate Detail Drawer */}
      {selectedCandidate && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedCandidate(null)} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 bottom-0 w-[420px] bg-white border-l border-[#E5E7EB] shadow-[-4px_0_16px_rgba(0,0,0,0.08)] z-50 overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E5E7EB]">
              <h2 className="text-[18px] font-semibold text-[#111827]">Candidate #{selectedCandidate.id}</h2>
              <button onClick={() => setSelectedCandidate(null)} className="p-1.5 rounded-[6px] hover:bg-[#F3F4F6] text-[#6B7280]">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <span className="text-[12px] text-[#6B7280] uppercase tracking-[0.05em]">Sequence</span>
                <p className="font-mono text-[16px] text-[#14B8A6] mt-1">{selectedCandidate.sequence}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <span className="text-[#6B7280]">Length</span>
                  <p className="font-medium text-[#111827]">{selectedCandidate.length}</p>
                </div>
                <div>
                  <span className="text-[#6B7280]">Net Charge</span>
                  <p className="font-medium text-[#111827]">{selectedCandidate.net_charge != null ? `${selectedCandidate.net_charge > 0 ? '+' : ''}${selectedCandidate.net_charge.toFixed(1)}` : '—'}</p>
                </div>
                <div>
                  <span className="text-[#6B7280]">Hydrophobic Fraction</span>
                  <p className="font-medium text-[#111827]">{selectedCandidate.hydrophobic_fraction != null ? selectedCandidate.hydrophobic_fraction.toFixed(2) : '—'}</p>
                </div>
                <div>
                  <span className="text-[#6B7280]">Valid AA</span>
                  <p className="font-medium text-[#111827]">{selectedCandidate.valid_aa === 1 ? 'Yes' : selectedCandidate.valid_aa === 0 ? 'No' : '—'}</p>
                </div>
              </div>
              <div>
                <span className="text-[12px] text-[#6B7280] uppercase tracking-[0.05em]">Status</span>
                <p className="text-[13px] font-medium text-[#111827] mt-1">{selectedCandidate.status}</p>
              </div>
              <div>
                <span className="text-[12px] text-[#6B7280] uppercase tracking-[0.05em]">Source</span>
                <p className="text-[13px] font-medium text-[#111827] mt-1">{selectedCandidate.source || '—'}</p>
              </div>
              <div>
                <span className="text-[12px] text-[#6B7280] uppercase tracking-[0.05em]">Generation Run</span>
                <p className="text-[13px] font-medium text-[#111827] mt-1">#{selectedCandidate.generation_run_id ?? '—'}</p>
              </div>
              <div>
                <span className="text-[12px] text-[#6B7280] uppercase tracking-[0.05em]">Rule-Based Rank</span>
                <p className="text-[13px] font-medium text-[#111827] mt-1">#{selectedCandidate.rule_based_rank}</p>
              </div>
              <div>
                <span className="text-[12px] text-[#6B7280] uppercase tracking-[0.05em]">Rule-Based Reason</span>
                <p className="text-[13px] text-[#111827] mt-1">{selectedCandidate.rule_based_reason}</p>
              </div>
              <div className="p-3 rounded-[6px] bg-gray-50 border border-gray-200">
                <p className="text-[12px] text-[#6B7280]">
                  <strong>AMP Score:</strong> {selectedCandidate.amp_score != null ? selectedCandidate.amp_score.toFixed(3) : 'Not computed'}
                </p>
                <p className="text-[12px] text-[#6B7280] mt-1">
                  <strong>MIC E.coli:</strong> {selectedCandidate.mic_ecoli != null ? selectedCandidate.mic_ecoli.toFixed(3) : 'Not computed'}
                </p>
                <p className="text-[12px] text-[#6B7280] mt-1">
                  <strong>MIC S.aureus:</strong> {selectedCandidate.mic_saureus != null ? selectedCandidate.mic_saureus.toFixed(3) : 'Not computed'}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
