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
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { DEMO_PEPTIDES } from '@/data/demoData'
import { useTranslation } from '@/i18n/LanguageContext'

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

const DEMO_HISTORY: ExportHistoryItem[] = [
  {
    id: 'EXP-20240117-001',
    date: new Date(Date.now() - 2 * 3600 * 1000),
    format: 'csv',
    formatLabel: 'CSV',
    scope: 'All',
    rows: 312,
    size: '45 KB',
    status: 'Ready',
  },
  {
    id: 'EXP-20240116-003',
    date: new Date(Date.now() - 26 * 3600 * 1000),
    format: 'fasta',
    formatLabel: 'FASTA',
    scope: 'Top 50',
    rows: 50,
    size: '8 KB',
    status: 'Ready',
  },
  {
    id: 'EXP-20240116-002',
    date: new Date(Date.now() - 28 * 3600 * 1000),
    format: 'pdf',
    formatLabel: 'PDF',
    scope: 'All',
    rows: 312,
    size: '180 KB',
    status: 'Ready',
  },
  {
    id: 'EXP-20240115-001',
    date: new Date(Date.now() - 48 * 3600 * 1000),
    format: 'xlsx',
    formatLabel: 'XLSX',
    scope: 'Filtered',
    rows: 89,
    size: '22 KB',
    status: 'Expired',
  },
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

function generateCsvPreview(): string {
  const headers = 'id,sequence,length,net_charge,molecular_weight,hydrophobicity,amp_score,mic_score,toxicity,hemolysis,status,generated_date,disclaimer'
  const rows = DEMO_PEPTIDES.slice(0, 5).map((p) => {
    const disclaimer = 'COMPUTATIONAL PREDICTIONS ONLY - NOT EXPERIMENTALLY VALIDATED'
    return `${p.id},"${p.sequence}",${p.length},${p.netCharge > 0 ? '+' : ''}${p.netCharge},${(p.length * 110 + Math.floor(Math.random() * 500)).toFixed(1)},${p.hydrophobicity},${p.ampScore},${p.micScore},${p.toxicityRisk},${p.hemolysisRisk},${p.status},${format(p.createdAt, 'yyyy-MM-dd')},"${disclaimer}"`
  })
  return [headers, ...rows].join('\n')
}

function generateFastaPreview(): string {
  return DEMO_PEPTIDES.slice(0, 5)
    .map(
      (p) =>
        `>peptide_${p.id} | AMP=${p.ampScore.toFixed(3)} | MIC=${p.micScore.toFixed(3)} | Status=${p.status}\n${p.sequence}`
    )
    .join('\n\n')
}

function generateJsonPreview(): string {
  const peptides = DEMO_PEPTIDES.slice(0, 5).map((p) => ({
    id: p.id,
    sequence: p.sequence,
    length: p.length,
    net_charge: p.netCharge,
    hydrophobicity: p.hydrophobicity,
    amp_score: p.ampScore,
    mic_score: p.micScore,
    toxicity_risk: p.toxicityRisk,
    hemolysis_risk: p.hemolysisRisk,
    status: p.status,
  }))
  return JSON.stringify(
    {
      report_title: 'AMPGen Analysis Report',
      generated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      disclaimer: 'COMPUTATIONAL PREDICTIONS ONLY - NOT EXPERIMENTALLY VALIDATED',
      peptide_count: 312,
      peptides,
    },
    null,
    2
  )
}

function generateXlsxPreview(): string {
  return [
    'Synthesis Order Template',
    'Generated: ' + format(new Date(), 'yyyy-MM-dd HH:mm'),
    '',
    'Sequence,Length,Scale,Purity,Modifications,Notes',
    ...DEMO_PEPTIDES.slice(0, 5).map(
      (p) =>
        `${p.sequence},${p.length},1mg,>95%,Amidation,AMP=${p.ampScore.toFixed(3)} MIC=${p.micScore.toFixed(3)}`
    ),
    '',
    'DISCLAIMER: All data is computational prediction only. Experimental validation required.',
  ].join('\n')
}

function generatePdfPreview(): string {
  return [
    'AMPGen Screening Report',
    '='.repeat(50),
    `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
    `Total Candidates: 312`,
    ``,
    'Top 5 Candidates by AMP Score:',
    '-'.repeat(50),
    ...DEMO_PEPTIDES.slice(0, 5).map(
      (p, i) =>
        `${i + 1}. ${p.sequence} (len=${p.length}) AMP=${p.ampScore.toFixed(3)} MIC=${p.micScore.toFixed(3)} Toxicity=${p.toxicityRisk.toFixed(3)}`
    ),
    '',
    'DISCLAIMER: All predictions are computational and NOT experimentally validated.',
    'Wet-lab validation (MIC assays, hemolysis, cytotoxicity) is REQUIRED.',
  ].join('\n')
}

function getPreviewForFormat(formatId: string): string {
  switch (formatId) {
    case 'csv':
      return generateCsvPreview()
    case 'fasta':
      return generateFastaPreview()
    case 'json':
      return generateJsonPreview()
    case 'xlsx':
      return generateXlsxPreview()
    case 'pdf':
      return generatePdfPreview()
    default:
      return generateCsvPreview()
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
  const [history, setHistory] = useState<ExportHistoryItem[]>(DEMO_HISTORY)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportComplete, setExportComplete] = useState(false)
  const [currentExportId, setCurrentExportId] = useState('')
  const [disclaimerPulse, setDisclaimerPulse] = useState(true)

  /* -- Preview content -- */
  const previewContent = useMemo(() => getPreviewForFormat(selectedFormat), [selectedFormat])
  const previewStats = useMemo(() => getPreviewStats(selectedFormat), [selectedFormat])

  /* -- Disclaimer pulse animation (2 iterations) -- */
  useEffect(() => {
    const t1 = setTimeout(() => setDisclaimerPulse(false), 4000)
    return () => clearTimeout(t1)
  }, [])

  /* -- Export handler -- */
  const handleExport = useCallback(() => {
    if (!disclaimerChecked) return
    setShowExportModal(true)
    setExportProgress(0)
    setExportComplete(false)

    const steps = 10
    let step = 0
    const interval = setInterval(() => {
      step++
      setExportProgress(Math.round((step / steps) * 100))
      if (step >= steps) {
        clearInterval(interval)
        setExportComplete(true)
        const fmt = EXPORT_FORMATS.find((f) => f.id === selectedFormat)
        const newId = `EXP-${format(new Date(), 'yyyyMMdd')}-${String(history.length + 1).padStart(3, '0')}`
        setCurrentExportId(newId)
        setHistory((prev) => [
          {
            id: newId,
            date: new Date(),
            format: selectedFormat,
            formatLabel: fmt?.extension.replace('.', '').toUpperCase() || 'CSV',
            scope: SCOPE_OPTIONS.find((s) => s.value === scope)?.label || 'All',
            rows: previewStats.rows,
            size: previewStats.size.replace('~', ''),
            status: 'Ready',
          },
          ...prev,
        ])
      }
    }, 300)
  }, [disclaimerChecked, selectedFormat, scope, previewStats, history.length])

  /* -- Download handler -- */
  const handleDownload = useCallback(() => {
    const fmt = EXPORT_FORMATS.find((f) => f.id === selectedFormat)
    const ext = fmt?.extension || '.csv'
    const filename = `ampgen_report_${format(new Date(), 'yyyyMMdd')}${ext}`
    const blob = new Blob([previewContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowExportModal(false)
  }, [selectedFormat, previewContent])

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

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] text-[#111827] text-[14px] font-medium rounded-[6px] hover:bg-[#F9FAFB] transition-colors"
            >
              <Eye size={14} />
              {t('common.preview') as string}
            </button>
            <button
              onClick={handleExport}
              disabled={!disclaimerChecked}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium rounded-[6px] transition-colors',
                disclaimerChecked
                  ? 'bg-[#14B8A6] text-white hover:bg-[#0D9488]'
                  : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
              )}
            >
              <Download size={14} />
              {t('common.export') as string}
            </button>
          </div>
        </div>

        {/* Right: Report Preview */}
        <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-[#14B8A6]" />
              <h2 className="text-[16px] font-semibold text-[#111827]">{t('reports.previewTitle') as string}</h2>
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
              onClick={() => {
                if (exportComplete) {
                  setShowExportModal(false)
                }
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="bg-white rounded-[12px] shadow-xl w-[440px] p-6"
                onClick={(e) => e.stopPropagation()}
              >
                {!exportComplete ? (
                  <>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-full bg-[#F0DFA] flex items-center justify-center">
                        <Loader2 size={20} className="text-[#14B8A6] animate-spin" />
                      </div>
                      <div>
                        <h3 className="text-[16px] font-semibold text-[#111827]">Generating Report</h3>
                        <p className="text-[13px] text-[#6B7280]">{selectedFormatConfig?.name}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden mb-2">
                      <motion.div
                        className="h-full bg-[#14B8A6] rounded-full"
                        animate={{ width: `${exportProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <div className="flex justify-between text-[12px] text-[#6B7280] mb-4">
                      <span>Processing...</span>
                      <span>{exportProgress}%</span>
                    </div>

                    <p className="text-[12px] text-[#9CA3AF]">
                      This may take a few moments depending on the export scope.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                        <Check size={20} className="text-[#10B981]" />
                      </div>
                      <div>
                        <h3 className="text-[16px] font-semibold text-[#111827]">{t('reports.exportSuccess') as string}</h3>
                        <p className="text-[13px] text-[#6B7280]">{currentExportId}</p>
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
                      <div className="flex justify-between text-[13px]">
                        <span className="text-[#6B7280]">Title</span>
                        <span className="text-[#111827] font-medium">{reportTitle}</span>
                      </div>
                    </div>

                    {/* Success disclaimer */}
                    <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-[6px] p-3 mb-5">
                      <p className="text-[12px] text-[#92400E]">
                        <strong>Remember:</strong> {t('reports.aiGenerated') as string}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownload}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#14B8A6] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#0D9488] transition-colors"
                      >
                        <Download size={14} />
                        {t('reports.downloadReport') as string}
                      </button>
                      <button
                        onClick={() => setShowExportModal(false)}
                        className="px-4 py-2 border border-[#E5E7EB] text-[#111827] text-[14px] font-medium rounded-[6px] hover:bg-[#F9FAFB] transition-colors"
                      >
                        {t('common.close') as string}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
