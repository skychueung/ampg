import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ClipboardCheck, AlertTriangle, CheckCircle, XCircle, Star,
  Beaker, FlaskConical, FileDown, FileText, Dna,
  BarChart3, GitCompare, Search, Filter,
  Copy, Check, Info, HelpCircle, ChevronLeft, ChevronRight,
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
  copyAllSequences,
} from '@/api/candidateReview'
import type { CandidateEvidence, ReviewSummary, P6FShortlistItem, P6FShortlistResponse } from '@/api/candidateReview'

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

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </span>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#111827] text-white text-[11px] rounded-[4px] whitespace-nowrap z-10 shadow-lg">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#111827]" />
        </span>
      )}
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
  const [p6fMetadata, setP6fMetadata] = useState<P6FShortlistResponse['metadata'] | null>(null)
  const [p6fPageSize, setP6fPageSize] = useState(25)
  const [p6fCurrentPage, setP6fCurrentPage] = useState(1)
  const [p6fCopiedAll, setP6fCopiedAll] = useState(false)
  const [p6fCopiedRow, setP6fCopiedRow] = useState<number | null>(null)

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
    setP6fCurrentPage(1)
    try {
      const res = await getP6FShortlist(p6fType)
      setP6fData(res.items)
      setP6fDisclaimer(res.disclaimer)
      setP6fMetadata(res.metadata || null)
    } catch {
      setP6fData([])
      setP6fDisclaimer('')
      setP6fMetadata(null)
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

  /* ---------------- P6F Pagination ---------------- */
  const totalPages = Math.max(1, Math.ceil(filteredP6f.length / p6fPageSize))
  const safePage = Math.min(p6fCurrentPage, totalPages)
  const pagedP6f = filteredP6f.slice((safePage - 1) * p6fPageSize, safePage * p6fPageSize)

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
          <div className="text-[12px] text-[#991B1B] space-y-1">
            <p>
              <strong>Computational predictions only.</strong> amp_score = P6E XGBoost AMP discriminator (Acc=0.9640). mic_saureus = P6F XGBoost baseline regressor (R²=0.8464) in μM.
              Neither constitutes experimental validation of antimicrobial activity, toxicity, or hemolysis.
            </p>
            <p>
              mic_ecoli remains <strong>null</strong> because no E. coli model is available. toxicity / hemolysis are not computed.
              Wet-lab validation is required before any therapeutic claims.
            </p>
            <p>
              <strong>representative</strong> candidates are selected by k-mer Jaccard deduplication (similarity threshold 0.8); they are not experimentally validated "best" peptides.
            </p>
          </div>
        </div>

        {/* P6F Controls */}
        <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-4 mb-3">
          {/* Active filter summary */}
          <div className="flex flex-wrap items-center gap-2 mb-3 text-[12px]">
            <span className="text-[#6B7280]">Active filters:</span>
            {p6fAmpLikeOnly && <Badge text="AMP-like ≥0.5" color="bg-emerald-50 text-emerald-700 border-emerald-200" />}
            {p6fMaxMic !== '' && <Badge text={`MIC ≤ ${p6fMaxMic} μM`} color="bg-blue-50 text-blue-700 border-blue-200" />}
            {p6fMinLength !== '' && <Badge text={`Len ≥ ${p6fMinLength}`} color="bg-amber-50 text-amber-700 border-amber-200" />}
            {p6fMaxLength !== '' && <Badge text={`Len ≤ ${p6fMaxLength}`} color="bg-amber-50 text-amber-700 border-amber-200" />}
            {!p6fAmpLikeOnly && p6fMaxMic === '' && p6fMinLength === '' && p6fMaxLength === '' && (
              <span className="text-[#9CA3AF]">None</span>
            )}
            <span className="ml-auto text-[#6B7280]">
              Showing <strong className="text-[#111827]">{filteredP6f.length}</strong> of <strong className="text-[#111827]">{p6fData.length}</strong> entries
              {p6fMetadata && (
                <span className="ml-1 text-[#9CA3AF]">(source: {p6fMetadata.source_manifest.split('/').pop()})</span>
              )}
            </span>
          </div>

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
              <label className="text-[11px] text-[#6B7280] block mb-1">Max MIC (μM)</label>
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
            <div>
              <label className="text-[11px] text-[#6B7280] block mb-1">Per Page</label>
              <select
                value={p6fPageSize}
                onChange={(e) => { setP6fPageSize(parseInt(e.target.value)); setP6fCurrentPage(1) }}
                className="px-2 py-1.5 border border-[#E5E7EB] rounded-[6px] text-[13px] bg-white w-[70px]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-[13px] text-[#374151]">
              <input
                type="checkbox"
                checked={p6fAmpLikeOnly}
                onChange={(e) => setP6fAmpLikeOnly(e.target.checked)}
                className="rounded"
              />
              AMP-like only (score ≥ 0.5)
            </label>
            <button
              onClick={() => {
                copyAllSequences(filteredP6f).then(() => {
                  setP6fCopiedAll(true)
                  setTimeout(() => setP6fCopiedAll(false), 2000)
                })
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#374151] text-[12px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
            >
              {p6fCopiedAll ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              Copy All Sequences
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => exportP6FShortlistCsv(filteredP6f, undefined, { filtered: true, type: p6fType, disclaimer: p6fDisclaimer })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#374151] text-[12px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
              >
                <FileDown size={12} /> Export Filtered
              </button>
              <button
                onClick={() => exportP6FShortlistCsv(p6fData, undefined, { filtered: false, type: p6fType, disclaimer: p6fDisclaimer })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#14B8A6] text-white text-[12px] font-medium rounded-[6px] hover:bg-[#0D9488] transition-colors"
              >
                <FileDown size={12} /> Export Full List
              </button>
            </div>
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
                      { key: 'rank', label: 'Rank', tip: 'Ranking position in current shortlist' },
                      { key: 'sequence', label: 'Sequence', tip: 'Amino acid sequence (click row copy button to copy)' },
                      { key: 'length', label: 'Len', tip: 'Peptide length in amino acids' },
                      { key: 'amp_score', label: 'AMP Score', tip: 'P6E XGBoost AMP discriminator prediction (0–1). ≥0.5 = AMP-like. Not experimental validation.' },
                      { key: 'mic_saureus', label: 'MIC S. aureus (μM)', tip: 'P6F XGBoost baseline MIC regressor prediction in μM. Lower = stronger predicted activity. Not experimental MIC.' },
                      { key: 'mic_ecoli', label: 'MIC E. coli', tip: 'E. coli MIC — null because no E. coli model is available.' },
                      { key: 'combined_rank_score', label: 'Combined', tip: 'Combined rank score = 0.5 × amp_percentile + 0.5 × mic_percentile (lower MIC = higher percentile). Balances AMP-likeness and predicted activity.' },
                      { key: 'net_charge_approx', label: 'Charge', tip: 'Approximate net charge at physiological pH' },
                      { key: 'hydrophobic_fraction', label: 'Hydro', tip: 'Fraction of hydrophobic amino acids' },
                      { key: 'source_group', label: 'Source', tip: 'Generation source group (e.g., server_production, server_batch)' },
                      { key: 'actions', label: '', tip: '' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className={`text-left px-3 py-2.5 ${col.key !== 'actions' ? 'cursor-pointer select-none hover:text-[#111827]' : ''}`}
                        onClick={col.key !== 'actions' ? () => handleP6fSort(col.key) : undefined}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.tip ? (
                            <Tooltip text={col.tip}>
                              <span className="inline-flex items-center gap-1">
                                {col.label}
                                <HelpCircle size={10} className="text-[#9CA3AF]" />
                              </span>
                            </Tooltip>
                          ) : col.label}
                          {p6fSortKey === col.key && col.key !== 'actions' && (
                            <span className="text-[10px]">{p6fSortDir === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedP6f.map((item) => (
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
                      <td className="px-3 py-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.sequence)
                            setP6fCopiedRow(item.rank)
                            setTimeout(() => setP6fCopiedRow(null), 2000)
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-[4px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
                          title="Copy sequence"
                        >
                          {p6fCopiedRow === item.rank ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between text-[11px] text-[#6B7280]">
              <div>
                Showing <strong className="text-[#111827]">{pagedP6f.length}</strong> of <strong className="text-[#111827]">{filteredP6f.length}</strong> filtered ({p6fData.length} total)
                {p6fDisclaimer && (
                  <span className="ml-2 text-[#991B1B]">{p6fDisclaimer}</span>
                )}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setP6fCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={p6fCurrentPage === 1}
                    className="px-2 py-1 rounded-[4px] border border-[#E5E7EB] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <span className="px-2">
                    Page <strong className="text-[#111827]">{p6fCurrentPage}</strong> / {totalPages}
                  </span>
                  <button
                    onClick={() => setP6fCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={p6fCurrentPage === totalPages}
                    className="px-2 py-1 rounded-[4px] border border-[#E5E7EB] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Field Legend */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.24 }}
        className="bg-white border border-[#E5E7EB] rounded-[8px] p-4">
        <h3 className="text-[14px] font-semibold text-[#111827] mb-3 flex items-center gap-2">
          <Info size={14} className="text-[#14B8A6]" /> Field Reference
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
          <div className="flex items-start gap-2">
            <span className="font-medium text-[#111827] min-w-[90px]">AMP Score</span>
            <span className="text-[#6B7280]">P6E XGBoost discriminator (binary:logistic). ≥0.5 = predicted AMP-like. Not experimental validation.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-[#111827] min-w-[90px]">MIC S. aureus</span>
            <span className="text-[#6B7280]">P6F XGBoost baseline regressor prediction in μM. Lower = stronger predicted activity. Not experimental MIC.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-[#111827] min-w-[90px]">MIC E. coli</span>
            <span className="text-[#6B7280]">null — no E. coli model available. Requires future data/model.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-[#111827] min-w-[90px]">Combined</span>
            <span className="text-[#6B7280]">0.5 × amp_percentile + 0.5 × mic_percentile. Balances AMP-likeness and predicted low-MIC activity.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-[#111827] min-w-[90px]">Representative</span>
            <span className="text-[#6B7280]">k-mer Jaccard deduplication (threshold 0.8). Computational diversity filter, not experimental "best".</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-[#111827] min-w-[90px]">Charge / Hydro</span>
            <span className="text-[#6B7280]">Approximate net charge at pH 7.4 and hydrophobic amino acid fraction. Descriptive only.</span>
          </div>
        </div>
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
