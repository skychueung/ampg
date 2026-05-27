import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Eye,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  FileSpreadsheet,
  FileText,
  Beaker,
  AlertTriangle,
  StickyNote,
  Copy,
  RefreshCw,
  ExternalLink,
  BarChart3,
} from 'lucide-react'
import { listPeptides } from '@/api/peptides'
import type { PeptideCandidate } from '@/api/peptides'
import { useTranslation } from '@/i18n/LanguageContext'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SortField = 'amp_score' | 'mic_ecoli' | 'length' | 'net_charge' | 'created_at'
type SortDir = 'asc' | 'desc'

interface NoteEntry {
  id: number
  peptideId: number
  text: string
  createdAt: Date
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS: { label: string; labelKey: string; value: string }[] = [
  { label: 'All Statuses', labelKey: 'common.all', value: 'ALL' },
  { label: 'Generated', labelKey: 'library.statusNew', value: 'GENERATED' },
  { label: 'Filtered', labelKey: 'library.statusSelected', value: 'FILTERED' },
  { label: 'Candidate', labelKey: 'library.statusSynthesized', value: 'CANDIDATE' },
  { label: 'Validated', labelKey: 'library.statusTested', value: 'VALIDATED' },
  { label: 'Rejected', labelKey: 'library.statusRejected', value: 'REJECTED' },
]

const SORT_OPTIONS: { label: string; labelKey: string; field: SortField; dir: SortDir }[] = [
  { label: 'AMP Score (High → Low)', labelKey: 'library.sortAMPScore', field: 'amp_score', dir: 'desc' },
  { label: 'AMP Score (Low → High)', labelKey: 'library.sortAMPScore', field: 'amp_score', dir: 'asc' },
  { label: 'MIC Score (High → Low)', labelKey: 'library.sortMICScore', field: 'mic_ecoli', dir: 'desc' },
  { label: 'Length (Short → Long)', labelKey: 'library.sortLength', field: 'length', dir: 'asc' },
  { label: 'Net Charge (High → Low)', labelKey: 'library.sortCharge', field: 'net_charge', dir: 'desc' },
  { label: 'Created Time (Newest)', labelKey: 'library.sortCreated', field: 'created_at', dir: 'desc' },
]

const PAGE_SIZE_OPTIONS = [20, 50, 100]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScoreColorClass(score: number | undefined | null, higherIsBetter = true): string {
  if (score == null) return 'text-[#9CA3AF]'
  if (higherIsBetter) {
    if (score >= 0.7) return 'text-[#10B981]'
    if (score >= 0.3) return 'text-[#F59E0B]'
    return 'text-[#EF4444]'
  }
  if (score <= 0.3) return 'text-[#10B981]'
  if (score <= 0.6) return 'text-[#F59E0B]'
  return 'text-[#EF4444]'
}

function getScoreBarColor(score: number | undefined | null, higherIsBetter = true): string {
  if (score == null) return 'bg-[#E5E7EB]'
  if (higherIsBetter) {
    if (score >= 0.7) return 'bg-[#10B981]'
    if (score >= 0.3) return 'bg-[#F59E0B]'
    return 'bg-[#EF4444]'
  }
  if (score <= 0.3) return 'bg-[#10B981]'
  if (score <= 0.6) return 'bg-[#F59E0B]'
  return 'bg-[#EF4444]'
}

function getStatusBadge(status: string): { labelKey: string; fallback: string; className: string } {
  switch (status) {
    case 'CANDIDATE':
      return { labelKey: 'library.statusSynthesized', fallback: 'Candidate', className: 'bg-[#F0FDFA] text-[#14B8A6] border-[#14B8A6]' }
    case 'VALIDATED':
      return { labelKey: 'library.statusTested', fallback: 'Validated', className: 'bg-emerald-50 text-[#10B981] border-[#10B981]' }
    case 'FILTERED':
      return { labelKey: 'library.statusSelected', fallback: 'Filtered', className: 'bg-blue-50 text-[#3B82F6] border-[#3B82F6]' }
    case 'GENERATED':
      return { labelKey: 'library.statusNew', fallback: 'Generated', className: 'bg-gray-50 text-[#6B7280] border-[#6B7280]' }
    case 'REJECTED':
      return { labelKey: 'library.statusRejected', fallback: 'Rejected', className: 'bg-red-50 text-[#EF4444] border-[#EF4444]' }
    default:
      return { labelKey: '', fallback: status, className: 'bg-gray-50 text-[#6B7280] border-[#6B7280]' }
  }
}

function truncateSeq(seq: string, max = 18): string {
  return seq.length > max ? seq.slice(0, max) + '...' : seq
}

function formatDate(value: string | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString()
}

/* ------------------------------------------------------------------ */
/*  Export helpers                                                     */
/* ------------------------------------------------------------------ */

function exportCSV(peptides: PeptideCandidate[], filename: string) {
  const headers = ['ID', 'Sequence', 'Length', 'Net_Charge', 'Hydrophobic_Fraction', 'Valid_AA', 'AMP_Score', 'MIC_Ecoli', 'MIC_SAureus', 'Status', 'Source', 'Notes', 'Created_At']
  const rows = peptides.map((p) => [
    p.id,
    p.sequence,
    p.length,
    p.net_charge ?? '',
    p.hydrophobic_fraction ?? '',
    p.valid_aa ?? '',
    p.amp_score ?? '',
    p.mic_ecoli ?? '',
    p.mic_saureus ?? '',
    p.status,
    p.source ?? '',
    `"${p.notes || ''}"`,
    p.created_at,
  ])
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportFASTA(peptides: PeptideCandidate[], filename: string) {
  const lines = peptides.map(
    (p) => `>AMP_${String(p.id).padStart(3, '0')}|score=${p.amp_score != null ? p.amp_score.toFixed(3) : 'N/A'}|mic_ecoli=${p.mic_ecoli != null ? p.mic_ecoli.toFixed(3) : 'N/A'}|status=${p.status}\n${p.sequence}`
  )
  const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportSynthesisTemplate(peptides: PeptideCandidate[], filename: string) {
  const headers = ['Order', 'Peptide_ID', 'Sequence', 'Length', 'Net_Charge', 'AMP_Score', 'Notes']
  const rows = peptides.map((p, i) => [
    i + 1,
    `AMP_${String(p.id).padStart(3, '0')}`,
    p.sequence,
    p.length,
    p.net_charge ?? '',
    p.amp_score != null ? p.amp_score.toFixed(3) : 'N/A',
    p.notes || '',
  ])
  const csv = ['# Synthesis Order Template', '# Generated by AMPGen Agent Platform', headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function CandidateLibrary() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  /* ── API Data ── */
  const [peptides, setPeptides] = useState<PeptideCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listPeptides()
      setPeptides(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch peptides from the server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ── State ── */
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [minAmpScore, setMinAmpScore] = useState(0)
  const [maxAmpScore, setMaxAmpScore] = useState(1)
  const [sortIndex, setSortIndex] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [notes, setNotes] = useState<NoteEntry[]>([])
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteTargetId, setNoteTargetId] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const exportRef = useRef<HTMLDivElement>(null)
  const batchRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportDropdownOpen(false)
      if (batchRef.current && !batchRef.current.contains(e.target as Node)) setBatchDropdownOpen(false)
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const currentSort = SORT_OPTIONS[sortIndex]

  /* ── Filter & Sort ── */
  const filtered = useMemo(() => {
    let data = [...peptides]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      data = data.filter(
        (p) => p.sequence.toLowerCase().includes(q) || String(p.id).includes(q)
      )
    }

    // Status
    if (statusFilter !== 'ALL') {
      data = data.filter((p) => p.status === statusFilter)
    }

    // AMP Score range
    data = data.filter((p) => {
      const score = p.amp_score ?? 0
      return score >= minAmpScore && score <= maxAmpScore
    })

    // Sort
    const { field, dir } = currentSort
    data.sort((a, b) => {
      const va = a[field]
      const vb = b[field]
      if (va == null && vb == null) return 0
      if (va == null) return dir === 'asc' ? -1 : 1
      if (vb == null) return dir === 'asc' ? 1 : -1
      if (va < vb) return dir === 'asc' ? -1 : 1
      if (va > vb) return dir === 'asc' ? 1 : -1
      return 0
    })

    return data
  }, [searchQuery, statusFilter, minAmpScore, maxAmpScore, currentSort, peptides])

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIdx = (safePage - 1) * pageSize
  const pageData = filtered.slice(startIdx, startIdx + pageSize)

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = filtered.length
    const withMic = filtered.filter((p) => p.mic_ecoli != null)
    const avgMic = withMic.length > 0 ? withMic.reduce((s, p) => s + p.mic_ecoli!, 0) / withMic.length : 0
    const withAmp = filtered.filter((p) => p.amp_score != null)
    const avgAmp = withAmp.length > 0 ? withAmp.reduce((s, p) => s + p.amp_score!, 0) / withAmp.length : 0
    const withCharge = filtered.filter((p) => p.net_charge != null)
    const avgCharge = withCharge.length > 0 ? withCharge.reduce((s, p) => s + p.net_charge!, 0) / withCharge.length : 0
    return { total, avgMic, avgAmp, avgCharge }
  }, [filtered])

  /* ── Selection ── */
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    const currentIds = new Set(pageData.map((p) => p.id))
    const allSelected = pageData.every((p) => selectedIds.has(p.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        currentIds.forEach((id) => next.delete(id))
      } else {
        currentIds.forEach((id) => next.add(id))
      }
      return next
    })
  }, [pageData, selectedIds])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const selectedPeptides = useMemo(
    () => peptides.filter((p) => selectedIds.has(p.id)),
    [selectedIds, peptides]
  )

  /* ── Notes ── */
  const openNoteModal = (peptideId: number) => {
    setNoteTargetId(peptideId)
    setNoteText('')
    setNoteModalOpen(true)
  }

  const saveNote = () => {
    if (!noteText.trim() || noteTargetId == null) return
    const newNote: NoteEntry = {
      id: Date.now(),
      peptideId: noteTargetId,
      text: noteText.trim(),
      createdAt: new Date(),
    }
    setNotes((prev) => [newNote, ...prev])
    setNoteText('')
    setNoteModalOpen(false)
    setNoteTargetId(null)
  }

  const getNotesForPeptide = (peptideId: number): NoteEntry[] => {
    return notes.filter((n) => n.peptideId === peptideId)
  }

  const hasNotes = (peptideId: number): boolean => {
    const peptide = peptides.find((p) => p.id === peptideId)
    return (peptide?.notes && peptide.notes.length > 0) || getNotesForPeptide(peptideId).length > 0
  }

  /* ── Copy ── */
  const copySequence = async (sequence: string, id: number) => {
    try {
      await navigator.clipboard.writeText(sequence)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = sequence
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    }
  }

  /* ── Batch status change ── */
  const batchChangeStatus = (_newStatus: string) => {
    clearSelection()
    setBatchDropdownOpen(false)
  }

  /* ── Reset page on filter change ── */
  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter, minAmpScore, maxAmpScore, pageSize])

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-semibold text-[#111827]">{t('library.title') as string}</h1>
            <p className="text-[14px] text-[#6B7280] mt-1">
              {t('library.subtitle') as string}{' '}
              <span className="font-medium text-[#111827]">{stats.total}</span>
            </p>
          </div>
          <button
            onClick={() => navigate('/peptide-analytics')}
            className="h-[36px] px-3 flex items-center gap-1.5 rounded-[6px] text-[13px] font-medium bg-[#F0FDFA] text-[#14B8A6] border border-[#14B8A6] hover:bg-[#ccfbf1] transition-colors"
          >
            <BarChart3 size={14} />
            Analytics
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="h-[36px] px-3 flex items-center gap-1.5 rounded-[6px] text-[13px] font-medium bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* ── Scientific Boundary Banner ── */}
      <div className="p-3 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-3">
        <AlertTriangle size={16} className="text-[#DC2626] mt-0.5 flex-shrink-0" />
        <p className="text-[13px] font-medium text-[#991B1B]">
          Computational prediction only. Not experimentally validated.
        </p>
      </div>

      {/* ── Stats Row ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-wrap gap-3"
      >
        {[
          { label: t('library.totalCandidates') as string, value: stats.total.toString(), color: 'text-[#6B7280]' },
          { label: t('library.avgAMPSore') as string, value: stats.avgAmp.toFixed(3), color: 'text-[#14B8A6]' },
          { label: t('library.avgMICScore') as string, value: stats.avgMic.toFixed(3), color: 'text-[#14B8A6]' },
          { label: t('library.avgCharge') as string, value: (stats.avgCharge > 0 ? '+' : '') + stats.avgCharge.toFixed(1), color: 'text-[#14B8A6]' },
        ].map((s) => (
          <div
            key={s.label}
            className="inline-flex items-center gap-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-4 py-2"
          >
            <span className={`text-[16px] font-semibold ${s.color}`}>{s.value}</span>
            <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">{s.label}</span>
          </div>
        ))}
      </motion.div>

      {/* ── Toolbar ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.15 }}
        className="flex flex-wrap items-center gap-2"
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder={t('library.searchPlaceholder') as string}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[36px] pl-9 pr-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#14B8A6] focus:ring-2 focus:ring-[rgba(20,184,166,0.1)] outline-none transition-all"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-[36px] px-3 pr-8 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] text-[13px] text-[#111827] focus:border-[#14B8A6] outline-none appearance-none cursor-pointer"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.labelKey) as string}
              </option>
            ))}
          </select>
          <Filter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
        </div>

        {/* Score Range Toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`h-[36px] px-3 flex items-center gap-1.5 rounded-[6px] text-[13px] font-medium border transition-colors ${
            showFilters
              ? 'bg-[#F0FDFA] text-[#14B8A6] border-[#14B8A6]'
              : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]'
          }`}
        >
          <ArrowUpDown size={13} />
          {t('library.filterScoreRange') as string}
        </button>

        {/* Sort Dropdown */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortDropdownOpen((v) => !v)}
            className="h-[36px] px-3 flex items-center gap-1.5 rounded-[6px] text-[13px] font-medium bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
          >
            <ArrowUpDown size={13} />
            {t(SORT_OPTIONS[sortIndex].labelKey) as string}
          </button>
          <AnimatePresence>
            {sortDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-1 w-[220px] bg-white border border-[#E5E7EB] rounded-[8px] shadow-lg z-30 py-1"
              >
                {SORT_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      setSortIndex(i)
                      setSortDropdownOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                      sortIndex === i ? 'bg-[#F0FDFA] text-[#14B8A6] font-medium' : 'text-[#111827] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export Dropdown */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportDropdownOpen((v) => !v)}
            className="h-[36px] px-3 flex items-center gap-1.5 rounded-[6px] text-[13px] font-medium bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
          >
            <Download size={13} />
            {t('common.export') as string}
          </button>
          <AnimatePresence>
            {exportDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-1 w-[220px] bg-white border border-[#E5E7EB] rounded-[8px] shadow-lg z-30 py-1"
              >
                <button
                  onClick={() => {
                    exportCSV(filtered, 'candidate_library.csv')
                    setExportDropdownOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] text-[#111827] hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
                >
                  <FileSpreadsheet size={14} className="text-[#6B7280]" />
                  {t('library.exportCSV') as string}
                </button>
                <button
                  onClick={() => {
                    exportFASTA(filtered, 'candidate_library.fasta')
                    setExportDropdownOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] text-[#111827] hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
                >
                  <FileText size={14} className="text-[#6B7280]" />
                  {t('library.exportFASTA') as string}
                </button>
                <button
                  onClick={() => {
                    exportSynthesisTemplate(filtered, 'synthesis_order_template.csv')
                    setExportDropdownOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] text-[#111827] hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
                >
                  <Beaker size={14} className="text-[#6B7280]" />
                  {t('library.exportTemplate') as string}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Score Range Filters ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-4 py-3">
              <span className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">{t('library.filterScoreRange') as string}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={minAmpScore}
                  onChange={(e) => setMinAmpScore(Number(e.target.value))}
                  className="w-[60px] h-[32px] px-2 bg-white border border-[#E5E7EB] rounded-[6px] text-[13px] text-[#111827] focus:border-[#14B8A6] outline-none"
                />
                <span className="text-[#9CA3AF]">—</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={maxAmpScore}
                  onChange={(e) => setMaxAmpScore(Number(e.target.value))}
                  className="w-[60px] h-[32px] px-2 bg-white border border-[#E5E7EB] rounded-[6px] text-[13px] text-[#111827] focus:border-[#14B8A6] outline-none"
                />
              </div>
              <button
                onClick={() => {
                  setMinAmpScore(0)
                  setMaxAmpScore(1)
                }}
                className="text-[12px] text-[#14B8A6] hover:text-[#0D9488] font-medium"
              >
                {t('common.cancel') as string}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Batch Operations Bar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 bg-[#F0FDFA] border border-[#14B8A6] rounded-[8px] px-4 py-2.5"
          >
            <span className="text-[13px] font-medium text-[#14B8A6]">
              {selectedIds.size} {t('library.selectedCount') as string}
            </span>
            <div className="w-px h-4 bg-[#14B8A6] opacity-30" />

            {/* Change Status */}
            <div className="relative" ref={batchRef}>
              <button
                onClick={() => setBatchDropdownOpen((v) => !v)}
                className="h-[30px] px-2.5 flex items-center gap-1 rounded-[6px] text-[12px] font-medium bg-white text-[#14B8A6] border border-[#14B8A6] hover:bg-[#F0FDFA] transition-colors"
              >
                {t('library.batchChangeStatus') as string}
              </button>
              <AnimatePresence>
                {batchDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 w-[140px] bg-white border border-[#E5E7EB] rounded-[8px] shadow-lg z-30 py-1"
                  >
                    {STATUS_OPTIONS.filter((o) => o.value !== 'ALL').map((o) => (
                      <button
                        key={o.value}
                        onClick={() => batchChangeStatus(o.value)}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-[#111827] hover:bg-[#F9FAFB] transition-colors"
                      >
                        {t(o.labelKey) as string}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Add Note */}
            <button
              onClick={() => {
                setNoteTargetId(null)
                setNoteText('')
                setNoteModalOpen(true)
              }}
              className="h-[30px] px-2.5 flex items-center gap-1 rounded-[6px] text-[12px] font-medium bg-white text-[#14B8A6] border border-[#14B8A6] hover:bg-[#F0FDFA] transition-colors"
            >
              <Edit3 size={11} />
              {t('library.batchAddNote') as string}
            </button>

            {/* Export Selected */}
            <button
              onClick={() => {
                exportCSV(selectedPeptides, 'selected_peptides.csv')
              }}
              className="h-[30px] px-2.5 flex items-center gap-1 rounded-[6px] text-[12px] font-medium bg-white text-[#14B8A6] border border-[#14B8A6] hover:bg-[#F0FDFA] transition-colors"
            >
              <Download size={11} />
              {t('library.exportSelected') as string}
            </button>

            <div className="flex-1" />
            <button
              onClick={clearSelection}
              className="text-[12px] text-[#6B7280] hover:text-[#EF4444] font-medium transition-colors"
            >
              {t('library.batchClearSelection') as string}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error State ── */}
      {error && (
        <div className="p-4 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[14px]">
          {error}
        </div>
      )}

      {/* ── Loading State ── */}
      {loading && (
        <div className="py-16 text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-[14px] text-[#6B7280] font-medium">Loading candidates...</p>
        </div>
      )}

      {/* ── Data Table ── */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                  <th className="px-3 py-3 w-[40px] text-center">
                    <button
                      onClick={toggleSelectAll}
                      className="w-4 h-4 rounded border border-[#D1D5DB] hover:border-[#14B8A6] flex items-center justify-center transition-colors"
                    >
                      {pageData.every((p) => selectedIds.has(p.id)) && pageData.length > 0 && (
                        <Check size={10} className="text-[#14B8A6]" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left">{t('library.columnSequence') as string}</th>
                  <th className="px-3 py-3 text-center">{t('library.columnLength') as string}</th>
                  <th className="px-3 py-3 text-center">{t('library.columnNetCharge') as string}</th>
                  <th className="px-3 py-3 text-center">Hydrophobic Fraction</th>
                  <th className="px-3 py-3 text-center">Valid AA</th>
                  <th className="px-3 py-3 text-center">{t('library.columnAMPScore') as string}</th>
                  <th className="px-3 py-3 text-center">MIC E.coli</th>
                  <th className="px-3 py-3 text-center">MIC S.aureus</th>
                  <th className="px-3 py-3 text-center">{t('library.columnStatus') as string}</th>
                  <th className="px-3 py-3 text-center">Source</th>
                  <th className="px-3 py-3 text-center">Source Run</th>
                  <th className="px-3 py-3 text-center">{t('library.columnNotes') as string}</th>
                  <th className="px-3 py-3 text-center">Created At</th>
                  <th className="px-3 py-3 text-center">{t('library.columnActions') as string}</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((peptide, idx) => {
                  const isSelected = selectedIds.has(peptide.id)
                  const badge = getStatusBadge(peptide.status)
                  const hasNote = hasNotes(peptide.id)

                  return (
                    <motion.tr
                      key={peptide.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.5) }}
                      className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors h-[48px]"
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleSelect(peptide.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#14B8A6] border-[#14B8A6]'
                              : 'border-[#D1D5DB] hover:border-[#14B8A6]'
                          }`}
                        >
                          {isSelected && <Check size={10} className="text-white" />}
                        </button>
                      </td>

                      {/* Sequence */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => navigate(`/peptide/${peptide.id}`)}
                            className="font-mono text-[13px] text-[#14B8A6] hover:underline cursor-pointer text-left"
                            title={peptide.sequence}
                          >
                            {truncateSeq(peptide.sequence)}
                          </button>
                          <button
                            onClick={() => copySequence(peptide.sequence, peptide.id)}
                            className="p-0.5 rounded text-[#9CA3AF] hover:text-[#14B8A6] transition-colors"
                            title={t('common.copy') as string}
                          >
                            {copiedId === peptide.id ? (
                              <Check size={11} className="text-[#10B981]" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Length */}
                      <td className="px-3 py-3 text-center text-[13px] text-[#111827]">{peptide.length}</td>

                      {/* Net Charge */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`text-[13px] font-medium ${
                            (peptide.net_charge ?? 0) > 3
                              ? 'text-[#EF4444]'
                              : (peptide.net_charge ?? 0) > 1
                                ? 'text-[#F59E0B]'
                                : 'text-[#3B82F6]'
                          }`}
                        >
                          {(peptide.net_charge ?? 0) > 0 ? '+' : ''}
                          {(peptide.net_charge ?? 0).toFixed(1)}
                        </span>
                      </td>

                      {/* Hydrophobic Fraction */}
                      <td className="px-3 py-3 text-center text-[13px] text-[#111827]">
                        {peptide.hydrophobic_fraction != null ? peptide.hydrophobic_fraction.toFixed(2) : '-'}
                      </td>

                      {/* Valid AA */}
                      <td className="px-3 py-3 text-center text-[13px] text-[#111827]">
                        {peptide.valid_aa != null ? peptide.valid_aa : '-'}
                      </td>

                      {/* AMP Score */}
                      <td className="px-3 py-3 text-center">
                        {peptide.amp_score != null ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-[12px] font-medium ${getScoreColorClass(peptide.amp_score)}`}>
                              {peptide.amp_score.toFixed(3)}
                            </span>
                            <div className="w-[50px] h-[4px] bg-[#E5E7EB] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getScoreBarColor(peptide.amp_score)}`}
                                style={{ width: `${peptide.amp_score * 100}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#9CA3AF]">Not computed</span>
                        )}
                      </td>

                      {/* MIC E.coli */}
                      <td className="px-3 py-3 text-center">
                        {peptide.mic_ecoli != null ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-[12px] font-medium ${getScoreColorClass(peptide.mic_ecoli)}`}>
                              {peptide.mic_ecoli.toFixed(3)}
                            </span>
                            <div className="w-[50px] h-[4px] bg-[#E5E7EB] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getScoreBarColor(peptide.mic_ecoli)}`}
                                style={{ width: `${peptide.mic_ecoli * 100}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#9CA3AF]">Not computed</span>
                        )}
                      </td>

                      {/* MIC S.aureus */}
                      <td className="px-3 py-3 text-center">
                        {peptide.mic_saureus != null ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-[12px] font-medium ${getScoreColorClass(peptide.mic_saureus)}`}>
                              {peptide.mic_saureus.toFixed(3)}
                            </span>
                            <div className="w-[50px] h-[4px] bg-[#E5E7EB] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getScoreBarColor(peptide.mic_saureus)}`}
                                style={{ width: `${peptide.mic_saureus * 100}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#9CA3AF]">Not computed</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.className}`}
                        >
                          {badge.labelKey ? t(badge.labelKey) as string : badge.fallback}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="px-3 py-3 text-center text-[12px] text-[#6B7280]">
                        {peptide.source === 'local_demo' ? 'Demo' : peptide.source === 'local_real_smoke' ? 'Real' : (peptide.source || '-')}
                      </td>

                      {/* Source Run */}
                      <td className="px-3 py-3 text-center">
                        {peptide.generation_run_id ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/generation-runs/${peptide.generation_run_id}`)
                            }}
                            className="inline-flex items-center gap-1 text-[12px] text-[#14B8A6] hover:text-[#0D9488] font-medium"
                            title="View source run"
                          >
                            #{peptide.generation_run_id}
                            <ExternalLink size={10} />
                          </button>
                        ) : (
                          <span className="text-[12px] text-[#9CA3AF]">—</span>
                        )}
                      </td>

                      {/* Notes indicator */}
                      <td className="px-3 py-3 text-center">
                        {hasNote && (
                          <button
                            onClick={() => openNoteModal(peptide.id)}
                            className="text-[#F59E0B] hover:text-[#D97706] transition-colors"
                            title={t('library.addNoteTitle') as string}
                          >
                            <StickyNote size={14} />
                          </button>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="px-3 py-3 text-center text-[12px] text-[#6B7280]">
                        {formatDate(peptide.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/peptide/${peptide.id}`)}
                            className="p-1.5 rounded-[4px] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#14B8A6] transition-colors"
                            title={t('common.view') as string}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => openNoteModal(peptide.id)}
                            className="p-1.5 rounded-[4px] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#14B8A6] transition-colors"
                            title={t('common.edit') as string}
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {pageData.length === 0 && (
            <div className="py-16 text-center">
              <Beaker size={32} className="text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-[14px] text-[#6B7280] font-medium">{t('common.noResults') as string}</p>
              <p className="text-[12px] text-[#9CA3AF] mt-1">{t('common.tryAdjustingFilters') as string}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Pagination ── */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#6B7280]">
              {filtered.length > 0 ? startIdx + 1 : 0}–
              {Math.min(startIdx + pageSize, filtered.length)} / {filtered.length} {t('library.totalCandidates') as string}
            </span>
            <div className="h-4 w-px bg-[#E5E7EB]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] text-[#9CA3AF]">{t('library.perPage') as string}</span>
              {PAGE_SIZE_OPTIONS.map((sz) => (
                <button
                  key={sz}
                  onClick={() => {
                    setPageSize(sz)
                    setPage(1)
                  }}
                  className={`h-[26px] px-2 rounded-[4px] text-[12px] font-medium transition-colors ${
                    pageSize === sz ? 'bg-[#F0FDFA] text-[#14B8A6]' : 'text-[#6B7280] hover:bg-[#F9FAFB]'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="w-[32px] h-[32px] flex items-center justify-center rounded-[6px] text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 7) {
                pageNum = i + 1
              } else if (safePage <= 4) {
                pageNum = i + 1
              } else if (safePage >= totalPages - 3) {
                pageNum = totalPages - 6 + i
              } else {
                pageNum = safePage - 3 + i
              }
              if (pageNum > totalPages) return null
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`min-w-[32px] h-[32px] px-2 flex items-center justify-center rounded-[6px] text-[13px] font-medium transition-colors ${
                    safePage === pageNum
                      ? 'bg-[#14B8A6] text-white'
                      : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="w-[32px] h-[32px] flex items-center justify-center rounded-[6px] text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Scientific Disclaimer Footer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="mt-4 p-3 rounded-[8px] bg-[#FFFBEB] border border-[#FCD34D] flex items-start gap-3"
      >
        <AlertTriangle size={16} className="text-[#D97706] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-[#92400E]">
            {t('common.disclaimer') as string}
          </p>
          <p className="text-[12px] text-[#B45309] mt-0.5">
            All AMP Scores, MIC values, toxicity, and hemolysis predictions are generated by AI models (AMPGen-Demo, XGBoost)
            and have NOT been experimentally validated. These values are for research screening purposes only.
          </p>
          <p className="text-[12px] text-[#B45309] mt-0.5">
            「所有数据均为 AI 模型计算预测，未经实验验证，仅供科研筛选参考。」
          </p>
        </div>
      </motion.div>

      {/* ── Add Note Modal ── */}
      <AnimatePresence>
        {noteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100] p-4"
            onClick={() => setNoteModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-[12px] shadow-xl w-full max-w-[500px] max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
                <h3 className="text-[16px] font-semibold text-[#111827]">
                  {t('library.addNoteTitle') as string}
                </h3>
                <button
                  onClick={() => setNoteModalOpen(false)}
                  className="p-1.5 rounded-[4px] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Existing Notes */}
              {noteTargetId && (
                <div className="px-5 py-3 border-b border-[#E5E7EB] max-h-[200px] overflow-y-auto">
                  <h4 className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-2">
                    {t('library.existingNotes') as string}
                  </h4>
                  <div className="space-y-2">
                    {/* Default note from data */}
                    {(() => {
                      const p = peptides.find((x) => x.id === noteTargetId)
                      return p?.notes ? (
                        <div className="bg-[#F9FAFB] rounded-[6px] px-3 py-2">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-medium text-[#6B7280]">System</span>
                            <span className="text-[10px] text-[#9CA3AF]">{formatDate(p.created_at)}</span>
                          </div>
                          <p className="text-[12px] text-[#111827]">{p.notes}</p>
                        </div>
                      ) : null
                    })()}
                    {/* User-added notes */}
                    {getNotesForPeptide(noteTargetId).map((note) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#F9FAFB] rounded-[6px] px-3 py-2"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-medium text-[#14B8A6]">User</span>
                          <span className="text-[10px] text-[#9CA3AF]">{note.createdAt.toLocaleString()}</span>
                        </div>
                        <p className="text-[12px] text-[#111827]">{note.text}</p>
                      </motion.div>
                    ))}
                    {getNotesForPeptide(noteTargetId).length === 0 &&
                      !peptides.find((x) => x.id === noteTargetId)?.notes && (
                        <p className="text-[12px] text-[#9CA3AF] italic">{t('common.placeholder') as string}</p>
                      )}
                  </div>
                </div>
              )}

              {/* Note Input */}
              <div className="px-5 py-4 flex-1">
                <label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-2 block">
                  {t('library.notePlaceholder') as string}
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={t('library.notePlaceholder') as string}
                  className="w-full min-h-[80px] p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] text-[13px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#14B8A6] focus:ring-2 focus:ring-[rgba(20,184,166,0.1)] outline-none resize-y transition-all"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#E5E7EB]">
                <button
                  onClick={() => setNoteModalOpen(false)}
                  className="h-[36px] px-4 rounded-[6px] text-[13px] font-medium text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
                >
                  {t('common.cancel') as string}
                </button>
                <button
                  onClick={saveNote}
                  disabled={!noteText.trim()}
                  className="h-[36px] px-4 rounded-[6px] text-[13px] font-medium bg-[#14B8A6] text-white hover:bg-[#0D9488] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('common.save') as string}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
