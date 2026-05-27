import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Dna, AlertTriangle, Copy, Check, Beaker, GitCompare,
  BarChart3, Cpu, Search, Zap,
} from 'lucide-react'
import {
  getSequenceOverview,
  getDuplicateSequences,
  getSimilarityPairs,
  getMotifEnrichment,
  getRepresentativePeptides,
} from '@/api/sequenceExplorer'
import type {
  SequenceOverview,
  DuplicateGroup,
  SimilarityPair,
  MotifEnrichment,
  RepresentativePeptide,
} from '@/api/sequenceExplorer'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function LoadingCard() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-5 h-[160px] flex items-center justify-center">
      <div className="inline-block w-6 h-6 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ErrorCard is available for future use
void ((_m: string) => {})

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

function useClipboard() {
  const [copied, setCopied] = useState(false)
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return { copied, copy }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SequenceExplorerPage() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<SequenceOverview | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [similarity, setSimilarity] = useState<SimilarityPair[]>([])
  const [motif, setMotif] = useState<MotifEnrichment | null>(null)
  const [representatives, setRepresentatives] = useState<RepresentativePeptide[]>([])

  const [simThreshold, setSimThreshold] = useState(0.8)
  const [simLimit, setSimLimit] = useState(100)
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [loadingDups, setLoadingDups] = useState(true)
  const [loadingSim, setLoadingSim] = useState(true)
  const [loadingMotif, setLoadingMotif] = useState(true)
  const [loadingReps, setLoadingReps] = useState(true)
  const [, setError] = useState<string | null>(null)

  const { copied, copy } = useClipboard()

  useEffect(() => {
    async function load() {
      setLoadingOverview(true)
      try {
        const o = await getSequenceOverview()
        setOverview(o)
      } catch (e: any) {
        setError(e.message || 'Failed to load overview')
      } finally {
        setLoadingOverview(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    async function load() {
      setLoadingDups(true)
      try {
        const d = await getDuplicateSequences()
        setDuplicates(d.duplicate_groups)
      } catch (e: any) {
        setError(e.message || 'Failed to load duplicates')
      } finally {
        setLoadingDups(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    async function load() {
      setLoadingSim(true)
      try {
        const s = await getSimilarityPairs(simThreshold, simLimit)
        setSimilarity(s.pairs)
      } catch (e: any) {
        setError(e.message || 'Failed to load similarity')
      } finally {
        setLoadingSim(false)
      }
    }
    load()
  }, [simThreshold, simLimit])

  useEffect(() => {
    async function load() {
      setLoadingMotif(true)
      try {
        const m = await getMotifEnrichment()
        setMotif(m)
      } catch (e: any) {
        setError(e.message || 'Failed to load motif enrichment')
      } finally {
        setLoadingMotif(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    async function load() {
      setLoadingReps(true)
      try {
        const r = await getRepresentativePeptides(10)
        setRepresentatives(r.representatives)
      } catch (e: any) {
        setError(e.message || 'Failed to load representatives')
      } finally {
        setLoadingReps(false)
      }
    }
    load()
  }, [])

  const copyFasta = (groups: { sequence: string; peptide_ids: number[] }[]) => {
    const lines = groups.map((g) => `>AMP_${g.peptide_ids.join('_')}\n${g.sequence}`)
    copy(lines.join('\n\n'))
  }

  // copyAllSequences is available for future use
  void copy

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
            <Dna size={20} className="text-[#14B8A6]" />
          </div>
          <div>
            <h1 className="text-[20px] font-semibold text-[#111827]">Peptide Sequence Explorer</h1>
            <p className="text-[14px] text-[#6B7280]">
              Explore duplicates, sequence similarity, and descriptive motif patterns in AMPGen-generated peptides.
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
          Computational sequence exploration only. Not experimentally validated. Sequence similarity does not imply functional equivalence.
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
          { text: 'Real database sequences', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { text: 'Descriptive sequence analysis only', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
          { text: 'Computational prediction only', bg: 'bg-gray-50 text-gray-500 border-gray-200' },
          { text: 'Not experimentally validated', bg: 'bg-gray-50 text-gray-500 border-gray-200' },
        ].map((b) => (
          <span key={b.text} className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium border ${b.bg}`}>
            {b.text}
          </span>
        ))}
      </motion.div>

      {/* Overview Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
          <Search size={16} className="text-[#14B8A6]" />
          Overview
        </h2>
        {loadingOverview || !overview ? (
          <div className="grid grid-cols-4 gap-4">
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Sequences" value={overview.total_sequences} icon={Dna} color="bg-[#14B8A6]" />
            <StatCard label="Unique Sequences" value={overview.unique_sequences} icon={Check} color="bg-emerald-500" />
            <StatCard label="Duplicate Groups" value={overview.duplicate_sequence_count} icon={Copy} color="bg-blue-500" />
            <StatCard label="Avg Length" value={overview.average_length ?? '—'} icon={BarChart3} color="bg-[#6B7280]" />
            <StatCard label="Min Length" value={overview.min_length ?? '—'} icon={Zap} color="bg-[#F59E0B]" />
            <StatCard label="Max Length" value={overview.max_length ?? '—'} icon={Zap} color="bg-[#8B5CF6]" />
            <StatCard label="Local Demo" value={overview.local_demo_count} icon={Beaker} color="bg-blue-500" />
            <StatCard label="Local Real Smoke" value={overview.local_real_smoke_count} icon={Beaker} color="bg-emerald-600" />
          </div>
        )}
      </motion.div>

      {/* Duplicate Groups */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-semibold text-[#111827] flex items-center gap-2">
            <Copy size={16} className="text-[#14B8A6]" />
            Duplicate Groups
          </h2>
          {duplicates.length > 0 && (
            <button
              onClick={() => copyFasta(duplicates)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-[6px] text-[12px] font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              Copy FASTA
            </button>
          )}
        </div>
        {loadingDups ? (
          <LoadingCard />
        ) : duplicates.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-6 text-[13px] text-[#6B7280]">
            No duplicated sequences detected.
          </div>
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    <th className="text-left px-4 py-2.5">Sequence</th>
                    <th className="text-center px-4 py-2.5">Count</th>
                    <th className="text-center px-4 py-2.5">Peptide IDs</th>
                    <th className="text-center px-4 py-2.5">Sources</th>
                    <th className="text-center px-4 py-2.5">Statuses</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicates.map((d) => (
                    <tr key={d.sequence} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                      <td className="px-4 py-2.5 font-mono text-[#14B8A6]">{d.sequence}</td>
                      <td className="px-4 py-2.5 text-center font-semibold">{d.count}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-[12px]">{d.peptide_ids.join(', ')}</td>
                      <td className="px-4 py-2.5 text-center text-[12px]">{d.sources.join(', ')}</td>
                      <td className="px-4 py-2.5 text-center text-[12px]">{d.statuses.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* Similarity Explorer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
          <GitCompare size={16} className="text-[#14B8A6]" />
          Similarity Explorer
        </h2>
        <div className="bg-[#FEFCE8] border border-[#FEF08A] rounded-[8px] p-3 mb-3">
          <p className="text-[12px] text-[#854D0E]">
            Sequence similarity is descriptive only and does not imply functional equivalence.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <label className="text-[13px] text-[#6B7280]">Threshold</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={simThreshold}
              onChange={(e) => setSimThreshold(parseFloat(e.target.value))}
              className="w-20 px-2 py-1.5 border border-[#E5E7EB] rounded-[6px] text-[13px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[13px] text-[#6B7280]">Limit</label>
            <input
              type="number"
              min={1}
              max={500}
              value={simLimit}
              onChange={(e) => setSimLimit(parseInt(e.target.value))}
              className="w-20 px-2 py-1.5 border border-[#E5E7EB] rounded-[6px] text-[13px]"
            />
          </div>
          <button
            onClick={() => {
              setSimThreshold(0.8)
              setSimLimit(100)
            }}
            className="px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-[6px] text-[12px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
          >
            Reset
          </button>
        </div>
        {loadingSim ? (
          <LoadingCard />
        ) : similarity.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-6 text-[13px] text-[#6B7280]">
            No similar sequence pairs found at threshold {simThreshold}.
          </div>
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    <th className="text-left px-4 py-2.5">Sequence 1</th>
                    <th className="text-left px-4 py-2.5">Sequence 2</th>
                    <th className="text-center px-4 py-2.5">Similarity</th>
                    <th className="text-center px-4 py-2.5">Length</th>
                    <th className="text-center px-4 py-2.5">Source 1</th>
                    <th className="text-center px-4 py-2.5">Source 2</th>
                  </tr>
                </thead>
                <tbody>
                  {similarity.map((p, i) => (
                    <tr key={i} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                      <td className="px-4 py-2.5 font-mono text-[#14B8A6] text-[12px]">{p.sequence_1}</td>
                      <td className="px-4 py-2.5 font-mono text-[#14B8A6] text-[12px]">{p.sequence_2}</td>
                      <td className="px-4 py-2.5 text-center font-semibold">{p.similarity.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-center text-[12px]">{p.length_1} / {p.length_2}</td>
                      <td className="px-4 py-2.5 text-center text-[12px]">{p.source_1 || '—'}</td>
                      <td className="px-4 py-2.5 text-center text-[12px]">{p.source_2 || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* Motif / Enrichment */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="space-y-4"
      >
        <h2 className="text-[16px] font-semibold text-[#111827] flex items-center gap-2">
          <Zap size={16} className="text-[#14B8A6]" />
          Descriptive Motif Statistics
        </h2>
        <div className="bg-[#FEFCE8] border border-[#FEF08A] rounded-[8px] p-3">
          <p className="text-[12px] text-[#854D0E]">
            Descriptive motif statistics only. Not functional motif validation.
          </p>
        </div>
        {loadingMotif || !motif ? (
          <LoadingCard />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Amino Acids */}
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Top Amino Acids</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={motif.top_amino_acids}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="aa" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Bar dataKey="frequency" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Dipeptides */}
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Top Dipeptides</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={motif.top_dipeptides}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="motif" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Bar dataKey="frequency" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* N-terminal */}
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">N-Terminal Position Frequencies</h3>
              <div className="space-y-2">
                {motif.n_terminal_position_frequencies.map((pos) => (
                  <div key={pos.position}>
                    <div className="text-[11px] font-medium text-[#6B7280] mb-1">Position {pos.position}</div>
                    <div className="flex flex-wrap gap-1">
                      {pos.frequencies.slice(0, 5).map((f) => (
                        <span key={f.aa} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#F0FDFA] text-[#14B8A6] text-[11px] font-medium">
                          {f.aa} {f.frequency.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* C-terminal */}
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-3">C-Terminal Position Frequencies</h3>
              <div className="space-y-2">
                {motif.c_terminal_position_frequencies.map((pos) => (
                  <div key={pos.position}>
                    <div className="text-[11px] font-medium text-[#6B7280] mb-1">Position {pos.position}</div>
                    <div className="flex flex-wrap gap-1">
                      {pos.frequencies.slice(0, 5).map((f) => (
                        <span key={f.aa} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#F0FDFA] text-[#14B8A6] text-[11px] font-medium">
                          {f.aa} {f.frequency.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Representative Peptides */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
          <Beaker size={16} className="text-[#14B8A6]" />
          Rule-Based Representative Peptides
        </h2>
        <p className="text-[12px] text-[#9CA3AF] mb-3">
          Rule-based representative selection only. Not a model prediction.
        </p>
        {loadingReps ? (
          <LoadingCard />
        ) : representatives.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-6 text-[13px] text-[#6B7280]">
            No representative peptides found.
          </div>
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    <th className="text-left px-4 py-2.5">Rank</th>
                    <th className="text-left px-4 py-2.5">Sequence</th>
                    <th className="text-center px-4 py-2.5">Length</th>
                    <th className="text-center px-4 py-2.5">Net Charge</th>
                    <th className="text-center px-4 py-2.5">Hydrophobic Frac</th>
                    <th className="text-center px-4 py-2.5">Status</th>
                    <th className="text-center px-4 py-2.5">Source</th>
                    <th className="text-left px-4 py-2.5">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {representatives.map((r) => (
                    <tr
                      key={r.peptide_id}
                      className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] cursor-pointer"
                      onClick={() => navigate(`/peptide/${r.peptide_id}`)}
                    >
                      <td className="px-4 py-2.5 text-[13px] font-bold text-[#14B8A6]">#{r.representative_rank}</td>
                      <td className="px-4 py-2.5 font-mono text-[#14B8A6]">{r.sequence}</td>
                      <td className="px-4 py-2.5 text-center">{r.length}</td>
                      <td className="px-4 py-2.5 text-center">
                        {r.net_charge != null ? `${r.net_charge > 0 ? '+' : ''}${r.net_charge.toFixed(1)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {r.hydrophobic_fraction != null ? r.hydrophobic_fraction.toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F0FDFA] text-[#14B8A6] border border-[#14B8A6]">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-[12px] text-[#6B7280]">
                        {r.source === 'local_demo' ? 'Demo' : r.source === 'local_real_smoke' ? 'Real' : (r.source || '—')}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-[#6B7280] max-w-[280px] truncate">{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
        className="flex flex-wrap items-center gap-3"
      >
        <button
          onClick={() => navigate('/candidate-library')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
        >
          <Beaker size={14} />
          Candidate Library
        </button>
        <button
          onClick={() => navigate('/peptide-analytics')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
        >
          <BarChart3 size={14} />
          Peptide Analytics
        </button>
        <button
          onClick={() => navigate('/run-comparison')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
        >
          <GitCompare size={14} />
          Run Comparison
        </button>
        <button
          onClick={() => navigate('/ampgen-workflow')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
        >
          <Cpu size={14} />
          AMPGen Workflow
        </button>
      </motion.div>
    </div>
  )
}
