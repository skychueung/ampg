import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SlidersHorizontal,
  Ruler,
  Dna,
  Zap,
  Droplets,
  CheckCircle,
  XCircle,
  ArrowRight,
  AlertTriangle,
  Filter,
  Info,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from '@/i18n/LanguageContext'
import Layout from '@/components/Layout'
import { DEMO_PEPTIDES } from '@/data/demoData'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface FilterResult {
  id: string
  sequence: string
  length: number
  netCharge: number
  hydrophobicity: number
  invalidAAs: string[]
  lengthOk: boolean
  chargeOk: boolean
  hydrophobicOk: boolean
  finalResult: 'PASS' | 'FAIL'
  failReasons: string[]
}

/* ------------------------------------------------------------------ */
/*  Physics helpers                                                    */
/* ------------------------------------------------------------------ */
const INVALID_AAS = ['U', 'O', 'B', 'Z', 'J', 'X']

function findInvalidAAs(sequence: string): string[] {
  const found: string[] = []
  for (const aa of sequence) {
    if (INVALID_AAS.includes(aa) && !found.includes(aa)) {
      found.push(aa)
    }
  }
  return found
}



function computeHydrophobicFraction(sequence: string): number {
  const hydrophobicSet = new Set(['A', 'V', 'I', 'L', 'M', 'F', 'W', 'Y', 'C'])
  let count = 0
  for (const aa of sequence) {
    if (hydrophobicSet.has(aa)) count += 1
  }
  return Math.round((count / sequence.length) * 100)
}

/* ------------------------------------------------------------------ */
/*  Easing                                                             */
/* ------------------------------------------------------------------ */
const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function AmpFilter() {
  const { t } = useTranslation()
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  /* ---------------------------------------------------------------- */
  /*  Build filter results from demo peptides                          */
  /* ---------------------------------------------------------------- */
  const filterResults: FilterResult[] = useMemo(() => {
    return DEMO_PEPTIDES.slice(0, 50).map((p) => {
      const invalidAAs = findInvalidAAs(p.sequence)
      const lengthOk = p.length >= 15 && p.length <= 35
      const chargeOk = p.netCharge > 0
      const hydroFrac = computeHydrophobicFraction(p.sequence)
      const hydrophobicOk = hydroFrac >= 40 && hydroFrac <= 70

      const failReasons: string[] = []
      if (invalidAAs.length > 0) failReasons.push(`Invalid amino acids: ${invalidAAs.join(', ')}`)
      if (!lengthOk) failReasons.push(`Length ${p.length} aa (require 15-35)`)
      if (!chargeOk) failReasons.push(`Net charge ${p.netCharge} (require >0)`)
      if (!hydrophobicOk) failReasons.push(`Hydrophobic fraction ${hydroFrac}% (require 40-70%)`)

      return {
        id: `filter-${p.id}`,
        sequence: p.sequence,
        length: p.length,
        netCharge: p.netCharge,
        hydrophobicity: p.hydrophobicity,
        invalidAAs,
        lengthOk,
        chargeOk,
        hydrophobicOk,
        finalResult: failReasons.length === 0 ? 'PASS' : 'FAIL',
        failReasons,
      }
    })
  }, [])

  /* ---------------------------------------------------------------- */
  /*  Pipeline step counts                                             */
  /* ---------------------------------------------------------------- */
  const totalInput = filterResults.length
  const afterInvalidAA = filterResults.filter((r) => r.invalidAAs.length === 0).length
  const afterLength = filterResults.filter((r) => r.invalidAAs.length === 0 && r.lengthOk).length
  const afterCharge = filterResults.filter(
    (r) => r.invalidAAs.length === 0 && r.lengthOk && r.chargeOk
  ).length
  const afterHydrophobic = filterResults.filter(
    (r) => r.invalidAAs.length === 0 && r.lengthOk && r.chargeOk && r.hydrophobicOk
  ).length

  /* ---------------------------------------------------------------- */
  /*  Summary stats                                                    */
  /* ---------------------------------------------------------------- */
  const passedAll = filterResults.filter((r) => r.finalResult === 'PASS').length
  const failedAll = filterResults.filter((r) => r.finalResult === 'FAIL').length

  const failByReason = useMemo(() => {
    const counts: Record<string, number> = {
      'Invalid AAs': 0,
      'Length': 0,
      'Net Charge': 0,
      'Hydrophobic': 0,
    }
    for (const r of filterResults) {
      if (r.finalResult === 'FAIL') {
        if (r.invalidAAs.length > 0) counts['Invalid AAs'] += 1
        if (!r.lengthOk) counts['Length'] += 1
        if (!r.chargeOk) counts['Net Charge'] += 1
        if (!r.hydrophobicOk) counts['Hydrophobic'] += 1
      }
    }
    return counts
  }, [filterResults])

  /* ---------------------------------------------------------------- */
  /*  Pie chart data                                                   */
  /* ---------------------------------------------------------------- */
  const pieData = [
    { name: t('filter.resultPass') as string, value: passedAll, color: '#10B981' },
    { name: t('filter.resultFail') as string, value: failedAll, color: '#EF4444' },
  ]

  /* ---------------------------------------------------------------- */
  /*  Filtered display                                                 */
  /* ---------------------------------------------------------------- */
  const displayResults = filterResults.filter((r) => {
    if (filterStatus === 'ALL') return true
    return r.finalResult === filterStatus
  })

  /* ---------------------------------------------------------------- */
  /*  Helper: check cell icon                                          */
  /* ---------------------------------------------------------------- */
  const CheckX = ({ ok }: { ok: boolean }) =>
    ok ? (
      <CheckCircle size={16} className="text-[#10B981]" />
    ) : (
      <XCircle size={16} className="text-[#EF4444]" />
    )

  return (
    <Layout title={t('filter.title') as string} subtitle={t('filter.subtitle') as string}>
      <div className="space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: easeOut }}
        >
          <h2 className="text-[20px] font-semibold text-[#111827]">{t('filter.title') as string}</h2>
          <p className="text-[14px] text-[#6B7280] mt-1">
            {t('filter.subtitle') as string}
          </p>
        </motion.div>

        {/* Filter Rules Overview — 4 cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08, ease: easeOut }}
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          {/* Length */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-4 hover:border-[#14B8A6] transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-[6px] bg-[#F0FDFA] flex items-center justify-center">
                <Ruler size={16} className="text-[#14B8A6]" />
              </div>
              <span className="text-[13px] font-semibold text-[#111827]">{t('filter.ruleLength') as string}</span>
            </div>
            <p className="text-[22px] font-bold text-[#111827]">15&ndash;35</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5 uppercase tracking-[0.05em]">
              {t('filter.ruleLengthDesc') as string}
            </p>
            <div className="mt-3 flex items-center justify-between text-[12px]">
              <span className="text-[#6B7280]">{t('common.pass') as string}</span>
              <span className="font-medium text-[#10B981]">
                {filterResults.filter((r) => r.lengthOk).length}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[12px]">
              <span className="text-[#6B7280]">{t('common.fail') as string}</span>
              <span className="font-medium text-[#EF4444]">
                {filterResults.filter((r) => !r.lengthOk).length}
              </span>
            </div>
          </div>

          {/* Amino Acids */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-4 hover:border-[#14B8A6] transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-[6px] bg-[#F0FDFA] flex items-center justify-center">
                <Dna size={16} className="text-[#14B8A6]" />
              </div>
              <span className="text-[13px] font-semibold text-[#111827]">{t('filter.ruleInvalidAA') as string}</span>
            </div>
            <p className="text-[14px] font-medium text-[#EF4444]">U, O, B, Z, J, X</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5 uppercase tracking-[0.05em]">
              {t('filter.ruleInvalidAADesc') as string}
            </p>
            <div className="mt-3 flex items-center justify-between text-[12px]">
              <span className="text-[#6B7280]">{t('common.clean') as string}</span>
              <span className="font-medium text-[#10B981]">
                {filterResults.filter((r) => r.invalidAAs.length === 0).length}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[12px]">
              <span className="text-[#6B7280]">{t('common.contaminated') as string}</span>
              <span className="font-medium text-[#EF4444]">
                {filterResults.filter((r) => r.invalidAAs.length > 0).length}
              </span>
            </div>
          </div>

          {/* Net Charge */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-4 hover:border-[#14B8A6] transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-[6px] bg-[#F0FDFA] flex items-center justify-center">
                <Zap size={16} className="text-[#14B8A6]" />
              </div>
              <span className="text-[13px] font-semibold text-[#111827]">{t('filter.ruleCharge') as string}</span>
            </div>
            <p className="text-[22px] font-bold text-[#111827]">&gt; 0</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5 uppercase tracking-[0.05em]">
              {t('filter.ruleChargeDesc') as string}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
              <Info size={11} />
              <span>{t('filter.chargeInfo') as string}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px]">
              <span className="text-[#6B7280]">{t('common.pass') as string}</span>
              <span className="font-medium text-[#10B981]">
                {filterResults.filter((r) => r.chargeOk).length}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[12px]">
              <span className="text-[#6B7280]">{t('common.fail') as string}</span>
              <span className="font-medium text-[#EF4444]">
                {filterResults.filter((r) => !r.chargeOk).length}
              </span>
            </div>
          </div>

          {/* Hydrophobic Fraction */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-4 hover:border-[#14B8A6] transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-[6px] bg-[#F0FDFA] flex items-center justify-center">
                <Droplets size={16} className="text-[#14B8A6]" />
              </div>
              <span className="text-[13px] font-semibold text-[#111827]">{t('filter.ruleHydrophobic') as string}</span>
            </div>
            <p className="text-[22px] font-bold text-[#111827]">40%&ndash;70%</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5 uppercase tracking-[0.05em]">
              {t('filter.ruleHydrophobicDesc') as string}
            </p>
            {/* Range visualization */}
            <div className="mt-3 relative h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-[#14B8A6] rounded-full"
                style={{ left: '40%', width: '30%' }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#9CA3AF] mt-0.5">
              <span>0%</span>
              <span>40%</span>
              <span>70%</span>
              <span>100%</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px]">
              <span className="text-[#6B7280]">{t('common.pass') as string}</span>
              <span className="font-medium text-[#10B981]">
                {filterResults.filter((r) => r.hydrophobicOk).length}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[12px]">
              <span className="text-[#6B7280]">{t('common.fail') as string}</span>
              <span className="font-medium text-[#EF4444]">
                {filterResults.filter((r) => !r.hydrophobicOk).length}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Filter Pipeline Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16, ease: easeOut }}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
        >
          <div className="flex items-center gap-2 mb-5">
            <Filter size={16} className="text-[#14B8A6]" />
            <h3 className="text-[16px] font-semibold text-[#111827]">{t('filter.pipelineTitle') as string}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Step 1: Input */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="px-4 py-2.5 rounded-[6px] bg-[#F0FDFA] border border-[#14B8A6] text-[13px] font-medium text-[#14B8A6] min-w-[100px] text-center">
                {t('filter.stepInput') as string}
              </div>
              <span className="text-[12px] text-[#6B7280] mt-1.5 font-medium">
                {totalInput} {t('filter.seqsSuffix') as string}
              </span>
            </motion.div>

            <ArrowRight size={18} className="text-[#E5E7EB] flex-shrink-0" />

            {/* Step 2: Remove Invalid AAs */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="px-4 py-2.5 rounded-[6px] bg-[#FEF2F2] border border-[#FECACA] text-[13px] font-medium text-[#DC2626] min-w-[100px] text-center">
                {t('filter.stepInvalidAA') as string}
              </div>
              <span className="text-[12px] text-[#6B7280] mt-1.5 font-medium">
                {afterInvalidAA} {t('common.pass') as string}
              </span>
            </motion.div>

            <ArrowRight size={18} className="text-[#E5E7EB] flex-shrink-0" />

            {/* Step 3: Length Check */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="px-4 py-2.5 rounded-[6px] bg-[#F0FDFA] border border-[#14B8A6] text-[13px] font-medium text-[#14B8A6] min-w-[100px] text-center">
                {t('filter.stepLength') as string}
              </div>
              <span className="text-[12px] text-[#6B7280] mt-1.5 font-medium">
                {afterLength} {t('common.pass') as string}
              </span>
            </motion.div>

            <ArrowRight size={18} className="text-[#E5E7EB] flex-shrink-0" />

            {/* Step 4: Net Charge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="flex flex-col items-center"
            >
              <div className="px-4 py-2.5 rounded-[6px] bg-[#FFFBEB] border border-[#FCD34D] text-[13px] font-medium text-[#D97706] min-w-[100px] text-center">
                {t('filter.stepCharge') as string}
              </div>
              <span className="text-[12px] text-[#6B7280] mt-1.5 font-medium">
                {afterCharge} {t('common.pass') as string}
              </span>
            </motion.div>

            <ArrowRight size={18} className="text-[#E5E7EB] flex-shrink-0" />

            {/* Step 5: Hydrophobic Fraction */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="flex flex-col items-center"
            >
              <div className="px-4 py-2.5 rounded-[6px] bg-[#EFF6FF] border border-[#93C5FD] text-[13px] font-medium text-[#2563EB] min-w-[100px] text-center">
                {t('filter.stepHydrophobic') as string}
              </div>
              <span className="text-[12px] text-[#6B7280] mt-1.5 font-medium">
                {afterHydrophobic} {t('common.pass') as string}
              </span>
            </motion.div>

            <ArrowRight size={18} className="text-[#E5E7EB] flex-shrink-0" />

            {/* Step 6: Output */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.6 }}
              className="flex flex-col items-center"
            >
              <div className="px-4 py-2.5 rounded-[6px] bg-[#ECFDF5] border border-[#10B981] text-[13px] font-medium text-[#059669] min-w-[100px] text-center">
                {t('filter.stepOutput') as string}
              </div>
              <span className="text-[12px] text-[#6B7280] mt-1.5 font-medium">
                {afterHydrophobic} {t('filter.filteredSuffix') as string}
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* Filter Results Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.24, ease: easeOut }}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-[#14B8A6]" />
              <h3 className="text-[16px] font-semibold text-[#111827]">{t('filter.resultsTitle') as string}</h3>
            </div>
            <div className="flex items-center gap-2">
              {(['ALL', 'PASS', 'FAIL'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors ${
                    filterStatus === s
                      ? 'bg-[#F0FDFA] text-[#14B8A6] border border-[#14B8A6]'
                      : 'bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F3F4F6]'
                  }`}
                >
                  {s === 'ALL' ? t('common.all') as string : s === 'PASS' ? t('common.passed') as string : t('common.failed') as string}
                  <span className="ml-1.5">
                    (
                    {s === 'ALL'
                      ? filterResults.length
                      : s === 'PASS'
                        ? passedAll
                        : failedAll}
                    )
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    {t('filter.columnSequence') as string}
                  </th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    {t('filter.columnLength') as string}
                  </th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    {t('filter.columnCharge') as string}
                  </th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    {t('filter.columnHydrophobicity') as string}
                  </th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    {t('filter.columnInvalidAA') as string}
                  </th>
                  <th className="text-center px-2 py-2.5 text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    {t('filter.columnLengthOK') as string}
                  </th>
                  <th className="text-center px-2 py-2.5 text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    {t('filter.columnChargeOK') as string}
                  </th>
                  <th className="text-center px-2 py-2.5 text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    {t('filter.columnHydrophobicOK') as string}
                  </th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    {t('filter.columnResult') as string}
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {displayResults.map((r, idx) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.3) }}
                      className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors relative"
                      onMouseEnter={() => setHoveredRow(r.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td className="px-3 py-2.5 text-[13px] font-mono text-[#14B8A6] truncate max-w-[140px]">
                        {r.sequence}
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#111827]">{r.length}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#111827]">
                        {r.netCharge > 0 ? '+' : ''}
                        {r.netCharge}
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#111827]">{r.hydrophobicity}</td>
                      <td className="px-3 py-2.5 text-[12px]">
                        {r.invalidAAs.length > 0 ? (
                          <span className="text-[#DC2626] font-medium">
                            {r.invalidAAs.join(', ')}
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">&mdash;</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <CheckX ok={r.lengthOk} />
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <CheckX ok={r.chargeOk} />
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <CheckX ok={r.hydrophobicOk} />
                      </td>
                      <td className="px-3 py-2.5">
                        {r.finalResult === 'PASS' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#ECFDF5] text-[#059669] border border-[#10B981]">
                            {t('filter.resultPass') as string}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#EF4444]">
                            {t('filter.resultFail') as string}
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Tooltip for failure reason */}
          <AnimatePresence>
            {hoveredRow && (() => {
              const row = filterResults.find((r) => r.id === hoveredRow)
              if (!row || row.finalResult === 'PASS') return null
              return (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mt-3 p-3 rounded-[6px] bg-[#1F2937] text-white text-[12px]"
                >
                  <p className="font-medium mb-1">{t('filter.failureReason') as string}</p>
                  {row.failReasons.map((reason, i) => (
                    <p key={i} className="text-[#D1D5DB]">
                      &bull; {reason}
                    </p>
                  ))}
                </motion.div>
              )
            })()}
          </AnimatePresence>
        </motion.div>

        {/* Filter Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.32, ease: easeOut }}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
        >
          <div className="flex items-center gap-2 mb-5">
            <SlidersHorizontal size={16} className="text-[#14B8A6]" />
            <h3 className="text-[16px] font-semibold text-[#111827]">{t('filter.summaryTitle') as string}</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-[#E5E7EB]">
                <span className="text-[13px] text-[#6B7280]">{t('filter.totalInput') as string}</span>
                <span className="text-[18px] font-bold text-[#111827]">{totalInput}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E5E7EB]">
                <span className="text-[13px] text-[#6B7280]">{t('filter.passedAll') as string}</span>
                <span className="text-[18px] font-bold text-[#10B981]">{passedAll}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E5E7EB]">
                <span className="text-[13px] text-[#6B7280]">{t('filter.failedAny') as string}</span>
                <span className="text-[18px] font-bold text-[#EF4444]">{failedAll}</span>
              </div>
              <div className="pt-1">
                <p className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-2">
                  {t('filter.failReasonBreakdown') as string}
                </p>
                {Object.entries(failByReason).map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between py-1">
                    <span className="text-[12px] text-[#6B7280]">{reason}</span>
                    <span className="text-[13px] font-medium text-[#111827]">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pie chart */}
            <div className="lg:col-span-2 flex items-center justify-center min-h-[250px]">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #E5E7EB',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Scientific Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4, ease: easeOut }}
          className="p-4 rounded-[8px] bg-[#F0FDFA] border border-[#14B8A6]"
        >
          <p className="text-[12px] text-[#0F766E] flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <strong>{t('common.computationalPrediction') as string}</strong> &mdash; {t('common.disclaimer') as string}
          </p>
        </motion.div>
      </div>
    </Layout>
  )
}
