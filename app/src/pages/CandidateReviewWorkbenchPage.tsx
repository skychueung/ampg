import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ClipboardCheck, AlertTriangle, CheckCircle, XCircle, Star,
  Beaker, FlaskConical, FileDown, FileText, Dna,
  BarChart3, GitCompare, Search, Filter,
  Copy, Check,
} from 'lucide-react'
import {
  getReviewCandidates,
  getCandidateEvidence,
  reviewCandidate,
  batchReviewCandidates,
  getShortlist,
  getReviewSummary,
  exportShortlistCsv,
  exportShortlistFasta,
  exportSynthesisOrderCsv,
  getP6FShortlist,
  exportP6FShortlistCsv,
} from '@/api/candidateReview'
import type { CandidateEvidence, ReviewSummary, P6FShortlistItem } from '@/api/candidateReview'

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

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
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

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${color}`}>
      {text}
    </span>
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CandidateReviewWorkbenchPage() {
  const navigate = useNavigate()
  const { copied, copy } = useClipboard()

  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [shortlist, setShortlist] = useState<any[]>([])
  const [evidenceMap, setEvidenceMap] = useState<Record<number, CandidateEvidence>>({})
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [filters, setFilters] = useState({
    status: '', source: '', review_status: '', priority: '',
    selected_for_synthesis: '',
    min_length: '', max_length: '',
    min_charge: '', max_charge: '',
    min_hydrophobic_fraction: '', max_hydrophobic_fraction: '',
    limit: '50',
  })

  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingCandidates, setLoadingCandidates] = useState(true)
  const [loadingShortlist, setLoadingShortlist] = useState(true)

  /* ---------------- P6F Combined Shortlist state ---------------- */
  const [p6fType, setP6fType] = useState('combined_top100')
  const [p6fData, setP6fData] = useState<P6FShortlistItem[]>([])
  const [p6fLoading, setP6fLoading] = useState(false)
  const [p6fSortKey, setP6fSortKey] = useState<string>('rank')
  const [p6fSortDir, setP6fSortDir] = useState<'asc' | 'desc'>('asc')
  const [p6fAmpLikeOnly, setP6fAmpLikeOnly] = useState(false)
  const [p6fMaxMic, setP6fMaxMic] = useState('')
  const [p6fMinLength, setP6fMinLength] = useState('')
  const [p6fMaxLength, setP6fMaxLength] = useState('')
  const [p6fDisclaimer, setP6fDisclaimer] = useState('')

  useEffect(() => { loadSummary() }, [])
  useEffect(() => { loadShortlist() }, [])
  useEffect(() => { loadCandidates() }, [])

  async function loadSummary() {
    setLoadingSummary(true)
    try { const s = await getReviewSummary(); setSummary(s) } catch {} finally { setLoadingSummary(false) }
  }

  async function loadShortlist() {
    setLoadingShortlist(true)
    try { const s = await getShortlist(); setShortlist(s) } catch {} finally { setLoadingShortlist(false) }
  }

  async function loadP6F() {
    setP6fLoading(true)
    try {
      const res = await getP6FShortlist(p6fType)
      setP6fData(res.items)
      setP6fDisclaimer(res.disclaimer)
    } catch {
      setP6fData([])
      setP6fDisclaimer('')
    } finally {
      setP6fLoading(false)
    }
  }

  useEffect(() => { loadP6F() }, [p6fType])

  const handleP6fSort = (key: string) => {
    if (p6fSortKey === key) {
      setP6fSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setP6fSortKey(key)
      setP6fSortDir(key === 'mic_saureus' || key === 'length' ? 'asc' : 'desc')
    }
  }

  const sortedP6f = [...p6fData].sort((a, b) => {
    const aVal = (a as any)[p6fSortKey]
    const bVal = (b as any)[p6fSortKey]
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return p6fSortDir === 'asc' ? cmp : -cmp
  })

  const filteredP6f = sortedP6f.filter((item) => {
    if (p6fAmpLikeOnly && !item.amp_like) return false
    if (p6fMaxMic !== '' && item.mic_saureus != null && item.mic_saureus > parseFloat(p6fMaxMic)) return false
    if (p6fMinLength !== '' && item.length < parseInt(p6fMinLength)) return false
    if (p6fMaxLength !== '' && item.length > parseInt(p6fMaxLength)) return false
    return true
  })

  async function loadCandidates() {
    setLoadingCandidates(true)
    try {
      const f: Record<string, any> = {}
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== '') {
          if (k === 'selected_for_synthesis') f[k] = v === 'true'
          else if (['min_length', 'max_length', 'limit'].includes(k)) f[k] = parseInt(v)
          else if (['min_charge', 'max_charge', 'min_hydrophobic_fraction', 'max_hydrophobic_fraction'].includes(k)) f[k] = parseFloat(v)
          else f[k] = v
        }
      })
      const c = await getReviewCandidates(f)
      setCandidates(c)
      setSelectedIds([])
    } catch {} finally { setLoadingCandidates(false) }
  }

  async function loadEvidence(peptideId: number) {
    if (evidenceMap[peptideId]) return
    try {
      const ev = await getCandidateEvidence(peptideId)
      setEvidenceMap((prev) => ({ ...prev, [peptideId]: ev }))
    } catch {}
  }

  async function doReview(peptideId: number, payload: any) {
    try {
      await reviewCandidate(peptideId, payload)
      await Promise.all([loadCandidates(), loadShortlist(), loadSummary()])
    } catch {}
  }

  async function doBatchReview(payload: any) {
    if (selectedIds.length === 0) return
    try {
      await batchReviewCandidates({ peptide_ids: selectedIds, ...payload })
      setSelectedIds([])
      await Promise.all([loadCandidates(), loadShortlist(), loadSummary()])
    } catch {}
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const selectAll = () => {
    if (selectedIds.length === candidates.length) setSelectedIds([])
    else setSelectedIds(candidates.map((c) => c.id))
  }

  const recommendationColor = (rec: string) => {
    if (rec === 'SHORTLIST_CANDIDATE') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (rec === 'REVIEW') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-gray-50 text-gray-600 border-gray-200'
  }

  const reviewStatusColor = (rs?: string | null) => {
    if (rs === 'SHORTLISTED') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (rs === 'REJECTED_BY_REVIEW') return 'bg-red-50 text-red-700 border-red-200'
    if (rs === 'NEEDS_MORE_REVIEW') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-gray-50 text-gray-500 border-gray-200'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[#F0FDFA] flex items-center justify-center">
            <ClipboardCheck size={20} className="text-[#14B8A6]" />
          </div>
          <div>
            <h1 className="text-[20px] font-semibold text-[#111827]">Candidate Review Workbench</h1>
            <p className="text-[14px] text-[#6B7280]">
              Review, shortlist, and prepare AMPGen-generated peptide candidates for downstream synthesis planning.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Scientific Boundary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
        className="p-3 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-3">
        <AlertTriangle size={14} className="text-[#DC2626] mt-0.5 flex-shrink-0" />
        <p className="text-[12px] text-[#991B1B]">
          Rule-based review only. Not experimentally validated. Shortlisted candidates require wet-lab validation before any functional claims.
        </p>
      </motion.div>

      {/* Status badges */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.06 }}
        className="flex flex-wrap gap-2">
        {[
          { text: 'Local Workstation Mode', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
          { text: 'Rule-based review only', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
          { text: 'Computational prediction only', bg: 'bg-gray-50 text-gray-500 border-gray-200' },
          { text: 'AMP score: P6E XGBoost', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { text: 'MIC: P6F S. aureus baseline', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { text: 'mic_ecoli: null (no model)', bg: 'bg-gray-50 text-gray-500 border-gray-200' },
        ].map((b) => (
          <span key={b.text} className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium border ${b.bg}`}>{b.text}</span>
        ))}
      </motion.div>

      {/* Summary Cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <h2 className="text-[16px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
          <Search size={16} className="text-[#14B8A6]" /> Overview
        </h2>
        {loadingSummary || !summary ? (
          <div className="grid grid-cols-4 gap-4"><LoadingCard /><LoadingCard /><LoadingCard /><LoadingCard /></div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Candidates" value={summary.total_candidates} icon={Beaker} color="bg-[#14B8A6]" />
            <StatCard label="Unreviewed" value={summary.unreviewed_count} icon={Search} color="bg-blue-500" />
            <StatCard label="Shortlisted" value={summary.shortlisted_count} icon={CheckCircle} color="bg-emerald-500" />
            <StatCard label="Selected for Synthesis" value={summary.selected_for_synthesis_count} icon={Star} color="bg-[#F59E0B]" />
            <StatCard label="High Priority" value={summary.high_priority_count} icon={Star} color="bg-[#8B5CF6]" />
            <StatCard label="Real Smoke Shortlisted" value={summary.local_real_smoke_shortlisted} icon={FlaskConical} color="bg-emerald-600" />
            <StatCard label="Demo Shortlisted" value={summary.local_demo_shortlisted} icon={FlaskConical} color="bg-blue-500" />
            <StatCard label="Rejected" value={summary.rejected_by_review_count} icon={XCircle} color="bg-red-500" />
          </div>
        )}
      </motion.div>

      {/* Filter Panel */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.12 }}
        className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-[#14B8A6]" />
          <span className="text-[14px] font-semibold text-[#111827]">Filters</span>
        </div>
        <div className="grid grid-cols-4 gap-3 text-[13px]">
          {[
            { label: 'Status', key: 'status', type: 'select', options: ['', 'GENERATED', 'FILTERED', 'CANDIDATE', 'REJECTED'] },
            { label: 'Source', key: 'source', type: 'select', options: ['', 'local_demo', 'local_real_smoke'] },
            { label: 'Review Status', key: 'review_status', type: 'select', options: ['', 'UNREVIEWED', 'SHORTLISTED', 'REJECTED_BY_REVIEW', 'NEEDS_MORE_REVIEW'] },
            { label: 'Priority', key: 'priority', type: 'select', options: ['', 'LOW', 'MEDIUM', 'HIGH'] },
            { label: 'Selected for Synthesis', key: 'selected_for_synthesis', type: 'select', options: ['', 'true', 'false'] },
            { label: 'Min Length', key: 'min_length', type: 'number' },
            { label: 'Max Length', key: 'max_length', type: 'number' },
            { label: 'Min Charge', key: 'min_charge', type: 'number' },
            { label: 'Max Charge', key: 'max_charge', type: 'number' },
            { label: 'Min Hydro Frac', key: 'min_hydrophobic_fraction', type: 'number' },
            { label: 'Max Hydro Frac', key: 'max_hydrophobic_fraction', type: 'number' },
            { label: 'Limit', key: 'limit', type: 'number' },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-[11px] text-[#6B7280] block mb-1">{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={(filters as any)[f.key]}
                  onChange={(e) => setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-[#E5E7EB] rounded-[6px] text-[13px] bg-white"
                >
                  {f.options!.map((o) => <option key={o} value={o}>{o === '' ? 'All' : o}</option>)}
                </select>
              ) : (
                <input
                  type="number"
                  value={(filters as any)[f.key]}
                  onChange={(e) => setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-[#E5E7EB] rounded-[6px] text-[13px]"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={loadCandidates} className="px-4 py-2 bg-[#14B8A6] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#0D9488] transition-colors">
            Apply Filters
          </button>
          <button onClick={() => { setFilters({ status: '', source: '', review_status: '', priority: '', selected_for_synthesis: '', min_length: '', max_length: '', min_charge: '', max_charge: '', min_hydrophobic_fraction: '', max_hydrophobic_fraction: '', limit: '50' }); setTimeout(loadCandidates, 0); }}
            className="px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
            Reset
          </button>
        </div>
      </motion.div>

      {/* Batch Actions */}
      {selectedIds.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#F0FDFA] border border-[#14B8A6] rounded-[8px] p-3 flex items-center gap-3">
          <span className="text-[13px] font-medium text-[#111827]">{selectedIds.length} selected</span>
          <button onClick={() => doBatchReview({ review_status: 'SHORTLISTED' })} className="px-3 py-1.5 bg-emerald-500 text-white text-[12px] font-medium rounded-[6px] hover:bg-emerald-600 transition-colors">Shortlist</button>
          <button onClick={() => doBatchReview({ priority: 'HIGH' })} className="px-3 py-1.5 bg-[#8B5CF6] text-white text-[12px] font-medium rounded-[6px] hover:bg-violet-600 transition-colors">High Priority</button>
          <button onClick={() => doBatchReview({ selected_for_synthesis: true })} className="px-3 py-1.5 bg-[#F59E0B] text-white text-[12px] font-medium rounded-[6px] hover:bg-amber-600 transition-colors">Select for Synthesis</button>
          <button onClick={() => doBatchReview({ review_status: 'REJECTED_BY_REVIEW' })} className="px-3 py-1.5 bg-red-500 text-white text-[12px] font-medium rounded-[6px] hover:bg-red-600 transition-colors">Reject</button>
          <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 bg-white text-[#374151] text-[12px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors ml-auto">Clear</button>
        </motion.div>
      )}

      {/* Candidate Evidence Cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-semibold text-[#111827] flex items-center gap-2">
            <Beaker size={16} className="text-[#14B8A6]" /> Candidates
          </h2>
          <button onClick={selectAll} className="text-[12px] text-[#14B8A6] hover:text-[#0D9488] font-medium">
            {selectedIds.length === candidates.length && candidates.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        {loadingCandidates ? (
          <LoadingCard />
        ) : candidates.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-6 text-[13px] text-[#6B7280]">No candidates match the current filters.</div>
        ) : (
          <div className="space-y-3">
            {candidates.map((c) => {
              const ev = evidenceMap[c.id]
              const isSelected = selectedIds.includes(c.id)
              return (
                <div key={c.id} className={`bg-white border rounded-[8px] p-4 transition-colors ${isSelected ? 'border-[#14B8A6] bg-[#F0FDFA]' : 'border-[#E5E7EB]'}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(c.id)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-mono text-[14px] font-semibold text-[#14B8A6]">{c.sequence}</span>
                        <Badge text={c.source || 'unknown'} color={c.source === 'local_real_smoke' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'} />
                        <Badge text={c.status} color="bg-[#F0FDFA] text-[#14B8A6] border-[#14B8A6]" />
                        {c.review_status && <Badge text={c.review_status} color={reviewStatusColor(c.review_status)} />}
                        {c.priority && <Badge text={c.priority} color={c.priority === 'HIGH' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-600 border-gray-200'} />}
                        {c.selected_for_synthesis && <Badge text="Synthesis" color="bg-amber-50 text-amber-700 border-amber-200" />}
                      </div>
                      <div className="grid grid-cols-6 gap-2 text-[12px] text-[#6B7280] mb-2">
                        <div>Length: <span className="text-[#111827] font-medium">{c.length}</span></div>
                        <div>Charge: <span className="text-[#111827] font-medium">{c.net_charge != null ? `${c.net_charge > 0 ? '+' : ''}${c.net_charge.toFixed(1)}` : '—'}</span></div>
                        <div>Hydro: <span className="text-[#111827] font-medium">{c.hydrophobic_fraction != null ? c.hydrophobic_fraction.toFixed(2) : '—'}</span></div>
                        <div>Valid AA: <span className="text-[#111827] font-medium">{c.valid_aa === 1 ? 'Yes' : c.valid_aa === 0 ? 'No' : '—'}</span></div>
                        <div>AMP Score: <span className="text-[#9CA3AF]">Not computed</span></div>
                        <div>MIC: <span className="text-[#9CA3AF]">Not computed</span></div>
                      </div>
                      {ev ? (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {[
                            { label: 'Length', pass: ev.evidence.length_rule.passed },
                            { label: 'Charge', pass: ev.evidence.charge_rule.passed },
                            { label: 'Hydro', pass: ev.evidence.hydrophobic_rule.passed },
                            { label: 'Valid AA', pass: ev.evidence.valid_aa_rule.passed },
                          ].map((r) => (
                            <span key={r.label} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[11px] font-medium border ${r.pass ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                              {r.pass ? <CheckCircle size={10} /> : <XCircle size={10} />} {r.label}
                            </span>
                          ))}
                          <Badge text={ev.rule_based_recommendation} color={recommendationColor(ev.rule_based_recommendation)} />
                        </div>
                      ) : (
                        <button onClick={() => loadEvidence(c.id)} className="text-[12px] text-[#14B8A6] hover:text-[#0D9488] font-medium mb-2">Load Evidence</button>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => doReview(c.id, { review_status: 'SHORTLISTED' })} className="px-2.5 py-1 bg-emerald-500 text-white text-[11px] font-medium rounded-[4px] hover:bg-emerald-600 transition-colors">Shortlist</button>
                        <button onClick={() => doReview(c.id, { review_status: 'REJECTED_BY_REVIEW' })} className="px-2.5 py-1 bg-red-500 text-white text-[11px] font-medium rounded-[4px] hover:bg-red-600 transition-colors">Reject</button>
                        <button onClick={() => doReview(c.id, { priority: 'HIGH' })} className="px-2.5 py-1 bg-[#8B5CF6] text-white text-[11px] font-medium rounded-[4px] hover:bg-violet-600 transition-colors">High Priority</button>
                        <button onClick={() => doReview(c.id, { selected_for_synthesis: true })} className="px-2.5 py-1 bg-[#F59E0B] text-white text-[11px] font-medium rounded-[4px] hover:bg-amber-600 transition-colors">Select for Synthesis</button>
                        <button onClick={() => navigate(`/peptide/${c.id}`)} className="px-2.5 py-1 bg-white text-[#374151] text-[11px] font-medium rounded-[4px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">View Detail</button>
                        {c.generation_run_id && (
                          <button onClick={() => navigate(`/generation-runs/${c.generation_run_id}`)} className="px-2.5 py-1 bg-white text-[#374151] text-[11px] font-medium rounded-[4px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">View Run</button>
                        )}
                        <button onClick={() => copy(c.sequence)} className="px-2.5 py-1 bg-white text-[#374151] text-[11px] font-medium rounded-[4px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                          {copied ? <Check size={10} className="inline text-emerald-500" /> : <Copy size={10} className="inline" />} Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Shortlist Panel */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-semibold text-[#111827] flex items-center gap-2">
            <Star size={16} className="text-[#14B8A6]" /> Shortlist
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => exportShortlistCsv().then((b) => downloadBlob(b, 'shortlist.csv'))} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#374151] text-[12px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
              <FileDown size={12} /> CSV
            </button>
            <button onClick={() => exportShortlistFasta().then((b) => downloadBlob(b, 'shortlist.fasta'))} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#374151] text-[12px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
              <FileText size={12} /> FASTA
            </button>
            <button onClick={() => exportSynthesisOrderCsv().then((b) => downloadBlob(b, 'synthesis_order.csv'))} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#14B8A6] text-white text-[12px] font-medium rounded-[6px] hover:bg-[#0D9488] transition-colors">
              <FileDown size={12} /> Synthesis Order
            </button>
          </div>
        </div>
        {loadingShortlist ? (
          <LoadingCard />
        ) : shortlist.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-6 text-[13px] text-[#6B7280]">No shortlisted candidates yet.</div>
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    <th className="text-left px-4 py-2.5">Sequence</th>
                    <th className="text-center px-4 py-2.5">Priority</th>
                    <th className="text-center px-4 py-2.5">Source</th>
                    <th className="text-center px-4 py-2.5">Synthesis</th>
                    <th className="text-center px-4 py-2.5">Batch</th>
                    <th className="text-left px-4 py-2.5">Review Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {shortlist.map((s) => (
                    <tr key={s.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                      <td className="px-4 py-2.5 font-mono text-[#14B8A6]">{s.sequence}</td>
                      <td className="px-4 py-2.5 text-center">
                        {s.priority && <Badge text={s.priority} color={s.priority === 'HIGH' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-600 border-gray-200'} />}
                      </td>
                      <td className="px-4 py-2.5 text-center text-[12px]">{s.source || '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        {s.selected_for_synthesis ? <CheckCircle size={14} className="text-emerald-500 inline" /> : <span className="text-[#9CA3AF]">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-[12px]">{s.batch_label || '—'}</td>
                      <td className="px-4 py-2.5 text-[12px] text-[#6B7280] max-w-[200px] truncate">{s.review_notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* P6F Combined Shortlist */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.23 }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-[6px] bg-[#F0FDFA] flex items-center justify-center">
            <BarChart3 size={16} className="text-[#14B8A6]" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[#111827]">P6F Combined Shortlist</h2>
            <p className="text-[12px] text-[#6B7280]">Browse ranked candidates from the 1000/1000 scored generation.</p>
          </div>
        </div>

        {/* P6F Scientific Boundary */}
        <div className="p-3 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-3 mb-3">
          <AlertTriangle size={14} className="text-[#DC2626] mt-0.5 flex-shrink-0" />
          <p className="text-[12px] text-[#991B1B]">
            amp_score and mic_saureus are computational predictions only. They do not represent experimental validation.
            mic_ecoli, toxicity, and hemolysis are not computed or remain null. Wet-lab validation is required before any therapeutic claims.
          </p>
        </div>

        {/* P6F Controls */}
        <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4 mb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-[11px] text-[#6B7280] block mb-1">Shortlist Type</label>
              <select
                value={p6fType}
                onChange={(e) => setP6fType(e.target.value)}
                className="px-2 py-1.5 border border-[#E5E7EB] rounded-[6px] text-[13px] bg-white"
              >
                <option value="combined_top100">Combined Top 100</option>
                <option value="combined_top50">Combined Top 50</option>
                <option value="combined_top20">Combined Top 20</option>
                <option value="low_mic_top100">Low-MIC Top 100</option>
                <option value="low_mic_top50">Low-MIC Top 50</option>
                <option value="low_mic_top20">Low-MIC Top 20</option>
                <option value="high_amp_top100">High-AMP Top 100</option>
                <option value="high_amp_top50">High-AMP Top 50</option>
                <option value="high_amp_top20">High-AMP Top 20</option>
                <option value="representative50">Representative 50</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#6B7280] block mb-1">Max MIC (uM)</label>
              <input
                type="number"
                value={p6fMaxMic}
                onChange={(e) => setP6fMaxMic(e.target.value)}
                placeholder="e.g. 5000"
                className="px-2 py-1.5 border border-[#E5E7EB] rounded-[6px] text-[13px] w-[100px]"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#6B7280] block mb-1">Min Length</label>
              <input
                type="number"
                value={p6fMinLength}
                onChange={(e) => setP6fMinLength(e.target.value)}
                placeholder="15"
                className="px-2 py-1.5 border border-[#E5E7EB] rounded-[6px] text-[13px] w-[70px]"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#6B7280] block mb-1">Max Length</label>
              <input
                type="number"
                value={p6fMaxLength}
                onChange={(e) => setP6fMaxLength(e.target.value)}
                placeholder="35"
                className="px-2 py-1.5 border border-[#E5E7EB] rounded-[6px] text-[13px] w-[70px]"
              />
            </div>
            <label className="flex items-center gap-2 text-[13px] text-[#374151]">
              <input
                type="checkbox"
                checked={p6fAmpLikeOnly}
                onChange={(e) => setP6fAmpLikeOnly(e.target.checked)}
                className="rounded"
              />
              AMP-like only (score &ge; 0.5)
            </label>
            <button
              onClick={() => exportP6FShortlistCsv(filteredP6f, `${p6fType}.csv`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#14B8A6] text-white text-[12px] font-medium rounded-[6px] hover:bg-[#0D9488] transition-colors ml-auto"
            >
              <FileDown size={12} /> Download CSV
            </button>
          </div>
        </div>

        {/* P6F Table */}
        {p6fLoading ? (
          <LoadingCard />
        ) : filteredP6f.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-6 text-[13px] text-[#6B7280]">
            No shortlist data found. The report may not have been generated yet, or filters are too strict.
          </div>
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    {[
                      { key: 'rank', label: 'Rank' },
                      { key: 'sequence', label: 'Sequence' },
                      { key: 'length', label: 'Len' },
                      { key: 'amp_score', label: 'AMP Score' },
                      { key: 'mic_saureus', label: 'MIC S. aureus (uM)' },
                      { key: 'mic_ecoli', label: 'MIC E. coli' },
                      { key: 'combined_rank_score', label: 'Combined' },
                      { key: 'net_charge_approx', label: 'Charge' },
                      { key: 'hydrophobic_fraction', label: 'Hydro' },
                      { key: 'source_group', label: 'Source' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className="text-left px-3 py-2.5 cursor-pointer select-none hover:text-[#111827]"
                        onClick={() => handleP6fSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {p6fSortKey === col.key && (
                            <span className="text-[10px]">{p6fSortDir === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredP6f.map((item) => (
                    <tr key={item.rank} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                      <td className="px-3 py-2 text-[#111827] font-medium">{item.rank}</td>
                      <td className="px-3 py-2 font-mono text-[#14B8A6]">{item.sequence}</td>
                      <td className="px-3 py-2">{item.length}</td>
                      <td className="px-3 py-2">
                        {item.amp_score != null ? (
                          <span className={item.amp_score >= 0.5 ? 'text-emerald-600 font-medium' : 'text-[#6B7280]'}>
                            {item.amp_score.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {item.mic_saureus != null ? item.mic_saureus.toFixed(2) : <span className="text-[#9CA3AF]">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {item.mic_ecoli ? item.mic_ecoli : <span className="text-[#9CA3AF]">null</span>}
                      </td>
                      <td className="px-3 py-2">
                        {item.combined_rank_score != null ? item.combined_rank_score.toFixed(4) : <span className="text-[#9CA3AF]">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {item.net_charge_approx != null ? `${item.net_charge_approx > 0 ? '+' : ''}${item.net_charge_approx.toFixed(1)}` : <span className="text-[#9CA3AF]">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {item.hydrophobic_fraction != null ? item.hydrophobic_fraction.toFixed(2) : <span className="text-[#9CA3AF]">—</span>}
                      </td>
                      <td className="px-3 py-2 text-[12px]">{item.source_group || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 bg-[#F9FAFB] border-t border-[#E5E7EB] text-[11px] text-[#6B7280]">
              Showing {filteredP6f.length} of {p6fData.length} entries
              {p6fDisclaimer && (
                <span className="ml-2 text-[#991B1B]">{p6fDisclaimer}</span>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Quick Links */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }}
        className="flex flex-wrap items-center gap-3">
        <button onClick={() => navigate('/candidate-library')} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
          <Beaker size={14} /> Candidate Library
        </button>
        <button onClick={() => navigate('/peptide-analytics')} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
          <BarChart3 size={14} /> Peptide Analytics
        </button>
        <button onClick={() => navigate('/sequence-explorer')} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
          <Dna size={14} /> Sequence Explorer
        </button>
        <button onClick={() => navigate('/run-comparison')} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
          <GitCompare size={14} /> Run Comparison
        </button>
      </motion.div>
    </div>
  )
}
