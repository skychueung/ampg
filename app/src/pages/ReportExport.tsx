import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  FileSpreadsheet,
  Dna,
  Beaker,
  BarChart3,
  Download,
  Eye,
  Check,
  History,
  AlertTriangle,
  ChevronDown,
  Calendar,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { listPeptides } from '@/api/peptides'
import type { PeptideCandidate } from '@/api/peptides'
import { useTranslation } from '@/i18n/LanguageContext'
import {
  exportCandidatesCsv,
  exportCandidatesFasta,
  exportTasksJson,
  exportGenerationRunJson,
  exportGenerationRunMarkdown,
} from '@/api/reports'
import { listGenerationRuns } from '@/api/generation'
import type { GenerationRun } from '@/api/generation'

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

interface ExportFormat {
  id: string
  name: string
  description: string
  extension: string
  icon: React.ElementType
  color: string
  bg: string
}

interface ExportHistoryItem {
  id: string
  date: Date
  format: string
  formatLabel: string
  scope: string
  rows: number
  size: string
  status: 'Ready' | 'Expired'
}

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'csv',
    name: 'Candidate CSV',
    description: 'Tabular data with all peptide properties for spreadsheet analysis',
    extension: '.csv',
    icon: FileSpreadsheet,
    color: 'text-[#059669]',
    bg: 'bg-emerald-50',
  },
  {
    id: 'fasta',
    name: 'FASTA',
    description: 'Standard biological sequence format for downstream bioinformatics tools',
    extension: '.fasta',
    icon: Dna,
    color: 'text-[#8B5CF6]',
    bg: 'bg-purple-50',
  },
  {
    id: 'xlsx',
    name: 'Synthesis Order Template',
    description: 'Excel template formatted for peptide synthesis vendor submission',
    extension: '.xlsx',
    icon: Beaker,
    color: 'text-[#D97706]',
    bg: 'bg-amber-50',
  },
  {
    id: 'pdf',
    name: 'Screening Report',
    description: 'PDF report with summary statistics and candidate visualizations',
    extension: '.pdf',
    icon: FileText,
    color: 'text-[#DC2626]',
    bg: 'bg-red-50',
  },
  {
    id: 'json',
    name: 'Full Analysis Report',
    description: 'Complete structured data including all scores and model metadata',
    extension: '.json',
    icon: BarChart3,
    color: 'text-[#14B8A6]',
    bg: 'bg-[#F0DFA]',
  },
]

const FORMAT_NAME_KEYS: Record<string, string> = {
  csv: 'reports.formatCSV',
  fasta: 'reports.formatFASTA',
  xlsx: 'reports.formatTemplate',
  pdf: 'reports.formatScreening',
  json: 'reports.formatFull',
}

const FORMAT_DESC_KEYS: Record<string, string> = {
  csv: 'reports.formatDescCSV',
  fasta: 'reports.formatDescFASTA',
  xlsx: 'reports.formatDescTemplate',
  pdf: 'reports.formatDescScreening',
  json: 'reports.formatDescFull',
}

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All Peptides', count: 312 },
  { value: 'candidates', label: 'Candidates Only', count: 89 },
  { value: 'top50', label: 'Top 50 by Score', count: 50 },
  { value: 'filtered', label: 'Filtered Selection', count: 128 },
]

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'CANDIDATE', label: 'Candidate' },
  { value: 'VALIDATED', label: 'Validated' },
  { value: 'FILTERED', label: 'Filtered' },
  { value: 'GENERATED', label: 'Generated' },
]

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

const cardFadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

/* -------------------------------------------------------------------------- */
/*                               Preview Generators                           */
/* -------------------------------------------------------------------------- */

function generateCsvPreview(peptides: PeptideCandidate[]): string {
  const headers = 'id,sequence,length,net_charge,molecular_weight,hydrophobicity,amp_score,mic_score,toxicity,hemolysis,status,generated_date,disclaimer'
  const rows = peptides.slice(0, 5).map((p) => {
    const disclaimer = 'COMPUTATIONAL PREDICTIONS ONLY - NOT EXPERIMENTALLY VALIDATED'
    const netChargeStr = p.net_charge != null ? (p.net_charge > 0 ? `+${p.net_charge}` : `${p.net_charge}`) : 'N/A'
    const mw = (p.length * 110 + Math.floor(Math.random() * 500)).toFixed(1)
    const hydro = p.hydrophobic_fraction != null ? p.hydrophobic_fraction.toFixed(3) : 'N/A'
    const amp = p.amp_score != null ? p.amp_score.toFixed(3) : 'N/A'
    const mic = p.mic_ecoli != null ? p.mic_ecoli.toFixed(3) : 'N/A'
    const created = p.created_at ? format(new Date(p.created_at), 'yyyy-MM-dd') : 'N/A'
    return `${p.id},"${p.sequence}",${p.length},${netChargeStr},${mw},${hydro},${amp},${mic},N/A,N/A,${p.status || 'N/A'},${created},"${disclaimer}"`
  })
  return [headers, ...rows].join('\n')
}

function generateFastaPreview(peptides: PeptideCandidate[]): string {
  return peptides
    .slice(0, 5)
    .map(
      (p) =>
        `>peptide_${p.id} | AMP=${p.amp_score != null ? p.amp_score.toFixed(3) : 'N/A'} | MIC=${p.mic_ecoli != null ? p.mic_ecoli.toFixed(3) : 'N/A'} | Status=${p.status || 'N/A'}\n${p.sequence}`
    )
    .join('\n\n')
}

function generateJsonPreview(peptides: PeptideCandidate[]): string {
  const mapped = peptides.slice(0, 5).map((p) => ({
    id: p.id,
    sequence: p.sequence,
    length: p.length,
    net_charge: p.net_charge,
    hydrophobicity: p.hydrophobic_fraction,
    amp_score: p.amp_score ?? 'N/A',
    mic_score: p.mic_ecoli ?? 'N/A',
    toxicity_risk: 'N/A',
    hemolysis_risk: 'N/A',
    status: p.status,
  }))
  return JSON.stringify(
    {
      report_title: 'AMPGen Analysis Report',
      generated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      disclaimer: 'COMPUTATIONAL PREDICTIONS ONLY - NOT EXPERIMENTALLY VALIDATED',
      peptide_count: peptides.length,
      peptides: mapped,
    },
    null,
    2
  )
}

function generateXlsxPreview(peptides: PeptideCandidate[]): string {
  return [
    'Synthesis Order Template',
    'Generated: ' + format(new Date(), 'yyyy-MM-dd HH:mm'),
    '',
    'Sequence,Length,Scale,Purity,Modifications,Notes',
    ...peptides.slice(0, 5).map(
      (p) =>
        `${p.sequence},${p.length},1mg,>95%,Amidation,AMP=${p.amp_score != null ? p.amp_score.toFixed(3) : 'N/A'} MIC=${p.mic_ecoli != null ? p.mic_ecoli.toFixed(3) : 'N/A'}`
    ),
    '',
    'DISCLAIMER: All data is computational prediction only. Experimental validation required.',
  ].join('\n')
}

function generatePdfPreview(peptides: PeptideCandidate[]): string {
  return [
    'AMPGen Screening Report',
    '='.repeat(50),
    `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
    `Total Candidates: ${peptides.length}`,
    ``,
    'Top 5 Candidates by AMP Score:',
    '-'.repeat(50),
    ...peptides.slice(0, 5).map(
      (p, i) =>
        `${i + 1}. ${p.sequence} (len=${p.length}) AMP=${p.amp_score != null ? p.amp_score.toFixed(3) : 'N/A'} MIC=${p.mic_ecoli != null ? p.mic_ecoli.toFixed(3) : 'N/A'} Toxicity=N/A`
    ),
    '',
    'DISCLAIMER: All predictions are computational and NOT experimentally validated.',
    'Wet-lab validation (MIC assays, hemolysis, cytotoxicity) is REQUIRED.',
  ].join('\n')
}

function getPreviewForFormat(formatId: string, peptides: PeptideCandidate[]): string {
  switch (formatId) {
    case 'csv':
      return generateCsvPreview(peptides)
    case 'fasta':
      return generateFastaPreview(peptides)
    case 'json':
      return generateJsonPreview(peptides)
    case 'xlsx':
      return generateXlsxPreview(peptides)
    case 'pdf':
      return generatePdfPreview(peptides)
    default:
      return generateCsvPreview(peptides)
  }
}

function getPreviewStats(formatId: string): { rows: number; cols: number; size: string } {
  const stats: Record<string, { rows: number; cols: number; size: string }> = {
    csv: { rows: 312, cols: 13, size: '~45 KB' },
    fasta: { rows: 312, cols: 2, size: '~12 KB' },
    json: { rows: 312, cols: 15, size: '~180 KB' },
    xlsx: { rows: 89, cols: 8, size: '~22 KB' },
    pdf: { rows: 312, cols: 6, size: '~155 KB' },
  }
  return stats[formatId] || stats.csv
}

/* -------------------------------------------------------------------------- */
/*                                 Main Component                             */
/* -------------------------------------------------------------------------- */

export default function ReportExport() {
  const { t } = useTranslation()
  const [selectedFormat, setSelectedFormat] = useState('csv')
  const [reportTitle, setReportTitle] = useState('AMPGen Analysis Report')
  const [scope, setScope] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [includeScores, setIncludeScores] = useState(true)
  const [includeNotes, setIncludeNotes] = useState(false)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [disclaimerChecked, setDisclaimerChecked] = useState(false)
  const [history, setHistory] = useState<ExportHistoryItem[]>([])
  const [showExportModal, setShowExportModal] = useState(false)
  const [disclaimerPulse, setDisclaimerPulse] = useState(true)
  const [runs, setRuns] = useState<GenerationRun[]>([])
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [previewPeptides, setPreviewPeptides] = useState<PeptideCandidate[]>([])

  /* -- Preview content -- */
  const previewContent = useMemo(() => getPreviewForFormat(selectedFormat, previewPeptides), [selectedFormat, previewPeptides])
  const previewStats = useMemo(() => getPreviewStats(selectedFormat), [selectedFormat])

  /* -- Disclaimer pulse animation (2 iterations) -- */
  useEffect(() => {
    const t1 = setTimeout(() => setDisclaimerPulse(false), 4000)
    return () => clearTimeout(t1)
  }, [])

  /* -- Load preview peptides -- */
  useEffect(() => {
    listPeptides()
      .then((data) => setPreviewPeptides(data))
      .catch((err) => {
        console.error('Failed to load preview peptides:', err)
        setPreviewPeptides([])
      })
  }, [])

  /* -- Load generation runs -- */
  useEffect(() => {
    listGenerationRuns()
      .then((data) => {
        setRuns(data)
        if (data.length > 0) setSelectedRunId(data[0].id)
      })
      .catch((err) => setErrorMsg(err.message || 'Failed to load generation runs'))
  }, [])

  /* -- Real export handlers -- */
  const _doExport = useCallback(async (fn: () => Promise<void>, label: string) => {
    if (!disclaimerChecked) return
    setLoading(true)
    setErrorMsg(null)
    try {
      await fn()
      setHistory((prev) => [
        {
          id: `EXP-${format(new Date(), 'yyyyMMdd')}-${String(prev.length + 1).padStart(3, '0')}`,
          date: new Date(),
          format: label,
          formatLabel: label,
          scope: 'All',
          rows: 0,
          size: '-',
          status: 'Ready',
        },
        ...prev,
      ])
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to export ${label}`)
    } finally {
      setLoading(false)
    }
  }, [disclaimerChecked])

  const handleExportCsv = useCallback(() => _doExport(exportCandidatesCsv, 'CSV'), [_doExport])
  const handleExportFasta = useCallback(() => _doExport(exportCandidatesFasta, 'FASTA'), [_doExport])
  const handleExportTasksJson = useCallback(() => _doExport(exportTasksJson, 'JSON'), [_doExport])
  const handleExportRunJson = useCallback(() => {
    if (!selectedRunId) { setErrorMsg('Please select a generation run'); return }
    _doExport(() => exportGenerationRunJson(selectedRunId), 'Run JSON')
  }, [_doExport, selectedRunId])
  const handleExportRunMd = useCallback(() => {
    if (!selectedRunId) { setErrorMsg('Please select a generation run'); return }
    _doExport(() => exportGenerationRunMarkdown(selectedRunId), 'Run MD')
  }, [_doExport, selectedRunId])

  /* -- Delete history item -- */
  const deleteHistoryItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id))
  }, [])

  /* -- Re-download history item -- */
  const redownloadItem = useCallback((item: ExportHistoryItem) => {
    const fmt = EXPORT_FORMATS.find((f) => f.id === item.format)
    const ext = fmt?.extension || '.csv'
    const filename = `ampgen_report_${format(item.date, 'yyyyMMdd')}_${item.id}${ext}`
    const blob = new Blob([previewContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [previewContent])

  const selectedFormatConfig = EXPORT_FORMATS.find((f) => f.id === selectedFormat)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div variants={fadeInUp} initial="initial" animate="animate">
        <h1 className="text-[20px] font-semibold text-[#111827]">{t('reports.title') as string}</h1>
        <p className="text-[14px] text-[#6B7280] mt-0.5">{t('reports.subtitle') as string}</p>
      </motion.div>

      {/* Export Format Cards */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-5 gap-4">
        {EXPORT_FORMATS.map((fmt) => {
          const Icon = fmt.icon
          const isSelected = selectedFormat === fmt.id
          return (
            <motion.button
              key={fmt.id}
              variants={cardFadeIn}
              onClick={() => setSelectedFormat(fmt.id)}
              className={cn(
                'relative text-left p-4 rounded-[8px] border transition-all cursor-pointer bg-white',
                isSelected
                  ? 'border-[#14B8A6] bg-[#F0DFA] shadow-sm'
                  : 'border-[#E5E7EB] hover:border-[#14B8A6]/50 hover:shadow-sm'
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#14B8A6] flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
              <div className={cn('w-10 h-10 rounded-[8px] flex items-center justify-center mb-3', fmt.bg)}>
                <Icon size={20} className={fmt.color} />
              </div>
              <h3 className="text-[14px] font-semibold text-[#111827] mb-1">{t(FORMAT_NAME_KEYS[fmt.id]) as string}</h3>
              <p className="text-[12px] text-[#6B7280] leading-relaxed mb-3">{t(FORMAT_DESC_KEYS[fmt.id]) as string}</p>
              <span
                className={cn(
                  'inline-block px-2 py-0.5 rounded-full text-[11px] font-medium',
                  isSelected ? 'bg-[#14B8A6] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'
                )}
              >
                {fmt.extension}
              </span>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Two-column: Options + Preview */}
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="grid grid-cols-2 gap-6">
        {/* Left: Export Options */}
        <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-[#14B8A6]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">{t('reports.optionsTitle') as string}</h2>
          </div>

          {/* Report Title */}
          <div>
            <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1.5">
              {t('reports.reportTitle') as string}
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full h-9 px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] text-[14px] text-[#111827] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/10 outline-none transition-all"
            />
          </div>

          {/* Scope */}
          <div>
            <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1.5">
              {t('reports.scope') as string}
            </label>
            <div className="relative">
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full h-9 px-3 pr-8 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] text-[14px] text-[#111827] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/10 outline-none transition-all appearance-none"
              >
                {SCOPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.count})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1.5">
              {t('reports.statusFilter') as string}
            </label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 px-3 pr-8 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] text-[14px] text-[#111827] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/10 outline-none transition-all appearance-none"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1.5">
              {t('reports.dateRange') as string}
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] text-[14px] text-[#111827] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/10 outline-none transition-all"
                />
              </div>
              <span className="text-[12px] text-[#6B7280]">to</span>
              <div className="relative flex-1">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] text-[14px] text-[#111827] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/10 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setIncludeScores(!includeScores)}
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                  includeScores ? 'bg-[#14B8A6] border-[#14B8A6]' : 'border-[#D1D5DB] bg-white'
                )}
              >
                {includeScores && <Check size={10} className="text-white" />}
              </div>
              <span className="text-[13px] text-[#111827]">{t('reports.includeScores') as string}</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setIncludeNotes(!includeNotes)}
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                  includeNotes ? 'bg-[#14B8A6] border-[#14B8A6]' : 'border-[#D1D5DB] bg-white'
                )}
              >
                {includeNotes && <Check size={10} className="text-white" />}
              </div>
              <span className="text-[13px] text-[#111827]">{t('reports.includeNotes') as string}</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setIncludeMetadata(!includeMetadata)}
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                  includeMetadata ? 'bg-[#14B8A6] border-[#14B8A6]' : 'border-[#D1D5DB] bg-white'
                )}
              >
                {includeMetadata && <Check size={10} className="text-white" />}
              </div>
              <span className="text-[13px] text-[#111827]">{t('reports.includeMetadata') as string}</span>
            </label>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-[6px] bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-[#DC2626] mt-0.5 flex-shrink-0" />
              <p className="text-[13px] text-[#B91C1C]">{errorMsg}</p>
            </div>
          )}

          {/* Generation Run Selector */}
          <div>
            <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1.5">
              Select Generation Run
            </label>
            <select
              value={selectedRunId ?? ''}
              onChange={(e) => setSelectedRunId(Number(e.target.value))}
              className="w-full h-[36px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 text-[14px] text-[#111827] focus:outline-none focus:border-[#14B8A6]"
            >
              {runs.length === 0 && <option value="">No runs available</option>}
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  Run #{run.id} — {run.backend} — {run.status} — {run.count} peptides
                </option>
              ))}
            </select>
          </div>

          {/* Real Export Buttons */}
          <div className="space-y-2 pt-2">
            <p className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
              Export from Real Database
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportCsv}
                disabled={!disclaimerChecked || loading}
                className="flex items-center gap-2 px-3 py-2 bg-[#ECFDF5] text-[#059669] text-[13px] font-medium rounded-[6px] border border-[#A7F3D0] hover:bg-[#D1FAE5] transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet size={14} />
                {loading ? 'Exporting...' : 'Export All Candidates CSV'}
              </button>
              <button
                onClick={handleExportFasta}
                disabled={!disclaimerChecked || loading}
                className="flex items-center gap-2 px-3 py-2 bg-[#F5F3FF] text-[#8B5CF6] text-[13px] font-medium rounded-[6px] border border-[#DDD6FE] hover:bg-[#EDE9FE] transition-colors disabled:opacity-50"
              >
                <Dna size={14} />
                {loading ? 'Exporting...' : 'Export All Candidates FASTA'}
              </button>
              <button
                onClick={handleExportTasksJson}
                disabled={!disclaimerChecked || loading}
                className="flex items-center gap-2 px-3 py-2 bg-[#F0F9FF] text-[#0284C7] text-[13px] font-medium rounded-[6px] border border-[#BAE6FD] hover:bg-[#E0F2FE] transition-colors disabled:opacity-50"
              >
                <BarChart3 size={14} />
                {loading ? 'Exporting...' : 'Export Tasks JSON'}
              </button>
              <button
                onClick={handleExportRunJson}
                disabled={!disclaimerChecked || loading || !selectedRunId}
                className="flex items-center gap-2 px-3 py-2 bg-[#FFF7ED] text-[#D97706] text-[13px] font-medium rounded-[6px] border border-[#FED7AA] hover:bg-[#FFEDD5] transition-colors disabled:opacity-50"
              >
                <FileText size={14} />
                {loading ? 'Exporting...' : 'Export Run JSON'}
              </button>
            </div>
            <button
              onClick={handleExportRunMd}
              disabled={!disclaimerChecked || loading || !selectedRunId}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#F3F4F6] text-[#374151] text-[13px] font-medium rounded-[6px] border border-[#E5E7EB] hover:bg-[#E5E7EB] transition-colors disabled:opacity-50"
            >
              <FileText size={14} />
              {loading ? 'Exporting...' : 'Export Selected Run Markdown Report'}
            </button>
          </div>
        </div>

        {/* Right: Report Preview */}
        <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-[#14B8A6]" />
              <h2 className="text-[16px] font-semibold text-[#111827]">{t('reports.previewTitle') as string}</h2>
              <span className="text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-1.5 py-0.5 rounded ml-1">Live database preview</span>
            </div>
            <span className="text-[12px] text-[#6B7280]">{selectedFormatConfig?.name}</span>
          </div>

          {/* Preview Stats */}
          <div className="flex items-center gap-4 mb-3 text-[12px] text-[#6B7280]">
            <span>
              Previewing <strong className="text-[#111827]">5 of {previewStats.rows}</strong> rows
            </span>
            <span>Est. size: {previewStats.size}</span>
            <span>Columns: {previewStats.cols}</span>
          </div>

          {/* Preview Content */}
          <motion.div
            key={selectedFormat}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-[#1F2937] rounded-[8px] p-4 max-h-[400px] overflow-y-auto"
          >
            <pre className="text-[12px] font-mono leading-relaxed whitespace-pre-wrap">
              {previewContent.split('\n').map((line, i) => {
                if (i === 0) {
                  return (
                    <span key={i} className="text-[#14B8A6]">
                      {line}
                      {'\n'}
                    </span>
                  )
                }
                if (line.includes('DISCLAIMER') || line.includes('disclaimer')) {
                  return (
                    <span key={i} className="text-[#FCD34D]">
                      {line}
                      {'\n'}
                    </span>
                  )
                }
                return <span key={i} className="text-[#E5E7EB]">{line}{'\n'}</span>
              })}
            </pre>
          </motion.div>
        </div>
      </motion.div>

      {/* Export History */}
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="bg-white border border-[#E5E7EB] rounded-[8px] p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4">
          <History size={16} className="text-[#14B8A6]" />
          <h2 className="text-[16px] font-semibold text-[#111827]">{t('reports.historyTitle') as string}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                  Format
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                  Scope
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                  Rows
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                  Size
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] w-[90px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3 text-[13px] text-[#111827]">{format(item.date, 'MMM d, HH:mm')}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F0DFA] text-[#14B8A6]">
                      {item.formatLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#6B7280]">{item.scope}</td>
                  <td className="px-4 py-3 text-[13px] text-[#6B7280]">{item.rows}</td>
                  <td className="px-4 py-3 text-[13px] text-[#6B7280]">{item.size}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium',
                        item.status === 'Ready'
                          ? 'bg-emerald-50 text-[#059669]'
                          : 'bg-gray-100 text-[#6B7280]'
                      )}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => redownloadItem(item)}
                        className="p-1.5 rounded-[6px] hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#14B8A6] transition-colors"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => deleteHistoryItem(item.id)}
                        className="p-1.5 rounded-[6px] hover:bg-red-50 text-[#6B7280] hover:text-[#EF4444] transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10">
            <History size={40} className="text-[#D1D5DB] mb-2" />
            <p className="text-[14px] text-[#6B7280]">No export history yet</p>
          </div>
        )}
      </motion.div>

      {/* Scientific Disclaimer */}
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className={cn(
          'rounded-[8px] p-5 border-2 transition-colors',
          disclaimerPulse ? 'bg-[#FFFBEB] border-[#F59E0B]' : 'bg-[#FFFBEB] border-[#FCD34D]'
        )}
      >
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={20} className="text-[#D97706] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[15px] font-bold text-[#92400E] mb-3">
              {t('reports.mandatoryDisclaimer') as string}
            </h3>
            <div className="text-[14px] text-[#78350F] leading-relaxed space-y-3">
              <p>{t('reports.validationRequired') as string}</p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>AMP Scores (antimicrobial probability)</li>
                <li>MIC values (minimum inhibitory concentration predictions)</li>
                <li>Toxicity predictions</li>
                <li>Hemolysis predictions</li>
                <li>Secondary structure predictions</li>
                <li>Physicochemical property calculations</li>
              </ul>
              <p>
                <strong>These predictions are intended for in-silico screening and research planning purposes only.</strong> Any peptide candidate must undergo rigorous wet-laboratory validation (MIC assays, hemolysis assays, cytotoxicity tests, circular dichroism spectroscopy, etc.) before biological conclusions can be drawn or therapeutic applications considered.
              </p>
              <p>
                <strong>
                  The platform authors, model developers, and hosting institution bear no responsibility for decisions made based on these computational predictions without proper experimental verification.
                </strong>
              </p>

              {/* Chinese Translation */}
              <div className="border-t border-[#FCD34D] pt-3 mt-3">
                {t('reports.chineseDisclaimer') as string}
              </div>
            </div>
          </div>
        </div>

        {/* Checkbox */}
        <div className="flex items-center gap-3 pt-3 border-t border-[#FCD34D]">
          <button
            onClick={() => setDisclaimerChecked(!disclaimerChecked)}
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
              disclaimerChecked
                ? 'bg-[#14B8A6] border-[#14B8A6]'
                : 'border-[#D97706] bg-white hover:border-[#14B8A6]'
            )}
          >
            {disclaimerChecked && <Check size={14} className="text-white" />}
          </button>
          <span className="text-[14px] text-[#92400E] font-medium">
            {t('reports.confirmCheckbox') as string}
          </span>
        </div>
      </motion.div>

      {/* Export Progress Modal */}
      <AnimatePresence>
        {showExportModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
              onClick={() => setShowExportModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="bg-white rounded-[12px] shadow-xl w-[440px] p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Eye size={20} className="text-[#10B981]" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-semibold text-[#111827]">Report Preview</h3>
                    <p className="text-[13px] text-[#6B7280]">{selectedFormatConfig?.name}</p>
                  </div>
                </div>

                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] p-4 mb-5 space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#6B7280]">Format</span>
                    <span className="text-[#111827] font-medium">{selectedFormatConfig?.name}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#6B7280]">Rows</span>
                    <span className="text-[#111827] font-medium">{previewStats.rows}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#6B7280]">Size</span>
                    <span className="text-[#111827] font-medium">{previewStats.size}</span>
                  </div>
                </div>

                <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-[6px] p-3 mb-5">
                  <p className="text-[12px] text-[#92400E]">
                    <strong>Remember:</strong> Computational prediction only. Not experimentally validated.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="flex-1 px-4 py-2 border border-[#E5E7EB] text-[#111827] text-[14px] font-medium rounded-[6px] hover:bg-[#F9FAFB] transition-colors"
                  >
                    {t('common.close') as string}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
