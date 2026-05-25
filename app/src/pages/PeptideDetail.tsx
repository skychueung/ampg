import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  ChevronLeft,
  Copy,
  Download,
  FlaskConical,
  BarChart3,
  Cpu,
  BookOpen,
  AlertTriangle,
  Box,
  Check,
  Beaker,
} from 'lucide-react'
import { getPeptideById,  } from '@/data/demoData'
import { useTranslation } from '@/i18n/LanguageContext'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ALL_AA = 'ACDEFGHIKLMNPQRSTVWY'.split('')

const AA_COLORS: Record<string, string> = {
  // Positive
  K: '#3B82F6',
  R: '#3B82F6',
  H: '#60A5FA',
  // Negative
  D: '#EF4444',
  E: '#EF4444',
  // Hydrophobic
  A: '#F59E0B',
  V: '#F59E0B',
  I: '#F59E0B',
  L: '#F59E0B',
  M: '#F59E0B',
  F: '#F59E0B',
  W: '#F59E0B',
  Y: '#F59E0B',
  C: '#F59E0B',
  // Polar
  S: '#10B981',
  T: '#10B981',
  N: '#10B981',
  Q: '#10B981',
  G: '#9CA3AF',
  P: '#9CA3AF',
}

const AA_PROPERTY: Record<string, string> = {
  K: 'Positive',
  R: 'Positive',
  H: 'Positive',
  D: 'Negative',
  E: 'Negative',
  A: 'Hydrophobic',
  V: 'Hydrophobic',
  I: 'Hydrophobic',
  L: 'Hydrophobic',
  M: 'Hydrophobic',
  F: 'Hydrophobic',
  W: 'Hydrophobic',
  Y: 'Hydrophobic',
  C: 'Hydrophobic',
  S: 'Polar',
  T: 'Polar',
  N: 'Polar',
  Q: 'Polar',
  G: 'Special',
  P: 'Special',
}

interface NoteEntry {
  id: number
  author: string
  text: string
  createdAt: Date
}

/* ------------------------------------------------------------------ */
/*  Helper: Calculate molecular weight (approximate)                  */
/* ------------------------------------------------------------------ */

const AA_WEIGHTS: Record<string, number> = {
  A: 89.09, C: 121.15, D: 133.10, E: 147.13, F: 165.19,
  G: 75.07, H: 155.16, I: 131.17, K: 146.19, L: 131.17,
  M: 149.21, N: 132.12, P: 115.13, Q: 146.15, R: 174.20,
  S: 105.09, T: 119.12, V: 117.15, W: 204.23, Y: 181.19,
}

function calcMolecularWeight(seq: string): number {
  let mw = 18.015 // water
  for (const aa of seq) {
    mw += AA_WEIGHTS[aa] ?? 110
  }
  return mw
}

function calcPI(seq: string): number {
  // Rough approximation based on residue composition
  let nPos = 0
  let nNeg = 0
  for (const aa of seq) {
    if ('KRH'.includes(aa)) nPos++
    if ('DE'.includes(aa)) nNeg++
  }
  if (nPos === 0 && nNeg === 0) return 7.0
  const ratio = nPos / (nPos + nNeg)
  return 4.0 + ratio * 8.0
}

function calcHydrophobicMoment(seq: string): number {
  // Placeholder calculation
  let moment = 0
  for (const aa of seq) {
    if ('VILFWYCM'.includes(aa)) moment += 0.5
  }
  return Number((moment / seq.length).toFixed(2))
}

function calcAliphaticIndex(seq: string): number {
  let score = 0
  for (const aa of seq) {
    if ('AILV'.includes(aa)) score += 2.9
  }
  return Number((score * (100 / seq.length)).toFixed(1))
}

function getSecondaryStructure(seq: string): string {
  const helix = 'EAKLQAM'
  const helixCount = seq.split('').filter((a) => helix.includes(a)).length
  return helixCount / seq.length > 0.3 ? 'alpha-Helix (predicted)' : 'Random Coil / Mixed (predicted)'
}

/* ------------------------------------------------------------------ */
/*  Helper: Score color                                               */
/* ------------------------------------------------------------------ */

function getScoreBarColor(score: number): string {
  if (score >= 0.7) return '#10B981'
  if (score >= 0.3) return '#F59E0B'
  return '#EF4444'
}

function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'CANDIDATE':
      return 'bg-[#F0FDFA] text-[#14B8A6] border-[#14B8A6]'
    case 'VALIDATED':
      return 'bg-emerald-50 text-[#10B981] border-[#10B981]'
    case 'FILTERED':
      return 'bg-blue-50 text-[#3B82F6] border-[#3B82F6]'
    case 'GENERATED':
      return 'bg-gray-50 text-[#6B7280] border-[#6B7280]'
    case 'REJECTED':
      return 'bg-red-50 text-[#EF4444] border-[#EF4444]'
    default:
      return 'bg-gray-50 text-[#6B7280] border-[#6B7280]'
  }
}

function getRiskBadge(risk: number): { labelKey: string; fallback: string; className: string } {
  if (risk < 0.3) return { labelKey: 'detail.low', fallback: 'Low', className: 'bg-emerald-50 text-[#10B981] border-[#10B981]' }
  if (risk < 0.6) return { labelKey: 'detail.moderate', fallback: 'Moderate', className: 'bg-amber-50 text-[#F59E0B] border-[#F59E0B]' }
  return { labelKey: 'detail.high', fallback: 'High', className: 'bg-red-50 text-[#EF4444] border-[#EF4444]' }
}

/* ------------------------------------------------------------------ */
/*  Animated Progress Bar                                              */
/* ------------------------------------------------------------------ */

function AnimatedProgressBar({ value, delay = 0 }: { value: number; delay?: number }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(value * 100)
    }, delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return (
    <div className="w-full h-[8px] bg-[#E5E7EB] rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: getScoreBarColor(value) }}
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function PeptideDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const peptideId = Number(id)
  const { t } = useTranslation()

  const peptide = getPeptideById(peptideId)

  /* ── Notes state ── */
  const [userNotes, setUserNotes] = useState<NoteEntry[]>([
    {
      id: 1,
      author: 'Dr. Zhang',
      text: 'High AMP score, low toxicity. Consider for synthesis.',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: 2,
      author: 'Lab Assistant',
      text: 'Added to batch #3 for MIC assay.',
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
  ])
  const [newNoteText, setNewNoteText] = useState('')
  const [statusValue, setStatusValue] = useState('')
  const [copiedSeq, setCopiedSeq] = useState(false)
  const [showStructureModal, setShowStructureModal] = useState(false)

  /* ── Memoized derived values ── */
  const aaComposition = useMemo(() => {
    if (!peptide) return []
    const counts: Record<string, number> = {}
    for (const aa of peptide.sequence) {
      counts[aa] = (counts[aa] || 0) + 1
    }
    return ALL_AA.map((aa) => ({
      aa,
      count: counts[aa] || 0,
      property: AA_PROPERTY[aa] || 'Unknown',
      fill: AA_COLORS[aa] || '#9CA3AF',
    }))
  }, [peptide])

  const mw = useMemo(() => (peptide ? calcMolecularWeight(peptide.sequence) : 0), [peptide])
  const pI = useMemo(() => (peptide ? calcPI(peptide.sequence) : 0), [peptide])
  const hydroMoment = useMemo(() => (peptide ? calcHydrophobicMoment(peptide.sequence) : 0), [peptide])
  const aliphaticIdx = useMemo(() => (peptide ? calcAliphaticIndex(peptide.sequence) : 0), [peptide])
  const secondaryStruct = useMemo(() => (peptide ? getSecondaryStructure(peptide.sequence) : ''), [peptide])

  /* ── Not found ── */
  if (!peptide) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Beaker size={48} className="text-[#D1D5DB] mb-4" />
        <h2 className="text-[18px] font-semibold text-[#111827] mb-2">{t('detail.notFound') as string}</h2>
        <p className="text-[14px] text-[#6B7280] mb-4">
          {t('detail.notFoundDesc') as string} #{id}
        </p>
        <button
          onClick={() => navigate('/candidate-library')}
          className="h-[36px] px-4 rounded-[6px] text-[13px] font-medium bg-[#14B8A6] text-white hover:bg-[#0D9488] transition-colors"
        >
          {t('detail.backToLibrary') as string}
        </button>
      </div>
    )
  }

  /* ── Handlers ── */
  const copySequence = async () => {
    try {
      await navigator.clipboard.writeText(peptide.sequence)
      setCopiedSeq(true)
      setTimeout(() => setCopiedSeq(false), 1500)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = peptide.sequence
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedSeq(true)
      setTimeout(() => setCopiedSeq(false), 1500)
    }
  }

  const exportFASTA = () => {
    const fasta = `>AMP_${String(peptide.id).padStart(3, '0')}|score=${peptide.ampScore.toFixed(3)}|mic=${peptide.micScore.toFixed(3)}|status=${peptide.status}\n${peptide.sequence}`
    const blob = new Blob([fasta], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `AMP_${String(peptide.id).padStart(3, '0')}.fasta`
    a.click()
    URL.revokeObjectURL(url)
  }

  const addNote = () => {
    if (!newNoteText.trim()) return
    const note: NoteEntry = {
      id: Date.now(),
      author: 'Researcher',
      text: newNoteText.trim(),
      createdAt: new Date(),
    }
    setUserNotes((prev) => [note, ...prev])
    setNewNoteText('')
  }

  const toxBadge = getRiskBadge(peptide.toxicityRisk)
  const hemoBadge = getRiskBadge(peptide.hemolysisRisk)
  const statusClasses = getStatusBadgeClasses(peptide.status)

  /* ── Position numbers for sequence ── */
  const positionNumbers = useMemo(() => {
    const positions: { label: string; isMark: boolean }[] = []
    for (let i = 0; i < peptide.sequence.length; i++) {
      if (i === 0 || (i + 1) % 5 === 0) {
        positions.push({ label: String(i + 1), isMark: true })
      } else {
        positions.push({ label: '', isMark: false })
      }
    }
    return positions
  }, [peptide.sequence])

  return (
    <div className="space-y-6">
      {/* ── Section 1: Back Navigation ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-2"
      >
        <button
          onClick={() => navigate('/candidate-library')}
          className="flex items-center gap-1 text-[14px] text-[#6B7280] hover:text-[#14B8A6] transition-colors"
        >
          <ChevronLeft size={16} />
          {t('detail.backToLibrary') as string}
        </button>
        <span className="text-[#D1D5DB]">›</span>
        <span className="text-[14px] font-medium text-[#111827]">Peptide #{peptide.id}</span>
      </motion.div>

      {/* ── Section 2: Hero Sequence Card ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[12px] p-6"
      >
        {/* ID Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
              {t('detail.peptideIdLabel') as string} #{peptide.id}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F0FDFA] text-[#14B8A6] border border-[#14B8A6]">
              AMPGen-Demo
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium border ${statusClasses}`}>
              {peptide.status}
            </span>
            {peptide.ampScore > 0.8 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-[#10B981] border border-[#10B981]">
                {t('detail.synthesisReady') as string}
              </span>
            )}
          </div>
        </div>

        {/* Sequence Display */}
        <div className="flex flex-col items-center py-4">
          <motion.div
            className="font-mono text-[24px] font-semibold text-[#14B8A6] tracking-[0.15em] text-center break-all leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {peptide.sequence.split('').map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: 0.25 + i * 0.02 }}
              >
                {char}
              </motion.span>
            ))}
          </motion.div>

          {/* Position numbers */}
          <div className="flex justify-center mt-2 gap-0">
            {positionNumbers.map((pos, i) => (
              <span
                key={i}
                className={`inline-block text-[10px] text-[#9CA3AF] text-center ${
                  pos.isMark ? '' : 'opacity-0'
                }`}
                style={{ width: 'calc(24px + 0.15em)', minWidth: '14px' }}
              >
                {pos.label}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <button
            onClick={copySequence}
            className="h-[36px] px-3 flex items-center gap-1.5 rounded-[6px] text-[13px] font-medium text-[#6B7280] hover:bg-[#F3F4F6] border border-[#E5E7EB] transition-colors"
          >
            {copiedSeq ? <Check size={14} className="text-[#10B981]" /> : <Copy size={14} />}
            {copiedSeq ? t('detail.copied') as string : t('detail.copySequence') as string}
          </button>
          <button
            onClick={exportFASTA}
            className="h-[36px] px-3 flex items-center gap-1.5 rounded-[6px] text-[13px] font-medium text-[#6B7280] hover:bg-[#F3F4F6] border border-[#E5E7EB] transition-colors"
          >
            <Download size={14} />
            {t('detail.exportFASTA') as string}
          </button>
          <button
            onClick={() => setShowStructureModal(true)}
            className="h-[36px] px-3 flex items-center gap-1.5 rounded-[6px] text-[13px] font-medium text-[#6B7280] hover:bg-[#F3F4F6] border border-[#E5E7EB] transition-colors"
          >
            <Box size={14} />
            {t('detail.view3D') as string}
          </button>
        </div>
      </motion.div>

      {/* ── Section 3: Two-Column Layout (Properties + Scores) ── */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Physicochemical Properties */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical size={16} className="text-[#14B8A6]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">{t('detail.physicochemicalTitle') as string}</h2>
          </div>

          <div className="space-y-0">
            {[
              { label: t('detail.propLength') as string, value: `${peptide.length} amino acids` },
              { label: t('detail.propMolecularWeight') as string, value: `${mw.toFixed(1)} Da` },
              {
                label: 'Net Charge (pH 7)',
                value: `${peptide.netCharge > 0 ? '+' : ''}${peptide.netCharge.toFixed(1)}`,
                note: peptide.netCharge > 0 ? t('detail.positiveTypicalForAMPs') as string : '',
                valueColor: peptide.netCharge > 0 ? 'text-[#10B981]' : 'text-[#3B82F6]',
              },
              {
                label: 'Isoelectric Point (pI)',
                value: pI.toFixed(1),
              },
              {
                label: 'Hydrophobicity',
                value: peptide.hydrophobicity.toFixed(3),
                note:
                  peptide.hydrophobicity > 0.5
                    ? t('detail.high') as string
                    : peptide.hydrophobicity > 0.2
                      ? t('detail.moderate') as string
                      : t('detail.low') as string,
              },
              {
                label: 'Hydrophobic Moment',
                value: hydroMoment.toFixed(2),
                note: 'Helix-forming potential',
              },
              { label: t('detail.propAliphaticIndex') as string, value: aliphaticIdx.toFixed(1), note: t('detail.thermalStabilityNote') as string },
              {
                label: 'Secondary Structure',
                value: secondaryStruct,
              },
              {
                label: 'Solubility',
                value: 'Soluble (predicted)',
                valueColor: 'text-[#10B981]',
              },
              {
                label: 'Invalid Amino Acids',
                value: 'None',
                valueColor: 'text-[#10B981]',
                note: 'All standard residues',
              },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6] last:border-0"
              >
                <span className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                  {row.label}
                </span>
                <div className="text-right">
                  <span className={`text-[14px] font-medium ${(row as Record<string, string>).valueColor || 'text-[#111827]'}`}>
                    {row.value}
                  </span>
                  {row.note && <span className="text-[11px] text-[#9CA3AF] ml-2">{row.note}</span>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right: AI Prediction Scores */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-[#14B8A6]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">{t('detail.predictionsTitle') as string}</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-[#D97706] border border-[#FCD34D]">
              {t('common.demoScoresDisclaimer') as string}
            </span>
          </div>

          <div className="space-y-5">
            {/* AMP Score */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-medium text-[#111827]">{t('detail.predAMPScore') as string}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold text-[#111827]">{peptide.ampScore.toFixed(3)}</span>
                  <span className="text-[11px] text-[#10B981]">
                    {peptide.ampScore > 0.7 ? t('detail.highAntimicrobialProbability') as string : peptide.ampScore > 0.4 ? t('detail.moderateProbability') as string : t('detail.lowProbability') as string}
                  </span>
                </div>
              </div>
              <AnimatedProgressBar value={peptide.ampScore} delay={100} />
            </div>

            {/* MIC Score */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-medium text-[#111827]">{t('detail.predMICScore') as string}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold text-[#111827]">{peptide.micScore.toFixed(3)}</span>
                  <span className="text-[11px] text-[#F59E0B]">{t('common.demoScoresDisclaimer') as string}</span>
                </div>
              </div>
              <AnimatedProgressBar value={peptide.micScore} delay={200} />
            </div>

            {/* Toxicity */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-medium text-[#111827]">{t('detail.predToxicity') as string}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[16px] font-bold ${peptide.toxicityRisk < 0.3 ? 'text-[#10B981]' : peptide.toxicityRisk < 0.6 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                    {peptide.toxicityRisk.toFixed(3)}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${toxBadge.className}`}>
                    {t(toxBadge.labelKey) as string || toxBadge.fallback}
                  </span>
                </div>
              </div>
              <AnimatedProgressBar value={peptide.toxicityRisk} delay={300} />
            </div>

            {/* Hemolysis */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-medium text-[#111827]">{t('detail.predHemolysis') as string}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[16px] font-bold ${peptide.hemolysisRisk < 0.3 ? 'text-[#10B981]' : peptide.hemolysisRisk < 0.6 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                    {peptide.hemolysisRisk.toFixed(3)}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${hemoBadge.className}`}>
                    {t(hemoBadge.labelKey) as string || hemoBadge.fallback}
                  </span>
                </div>
              </div>
              <AnimatedProgressBar value={peptide.hemolysisRisk} delay={400} />
            </div>

            {/* Stability (derived from ampScore) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-medium text-[#111827]">{t('detail.predStability') as string}</span>
                <span className="text-[16px] font-bold text-[#111827]">{Math.min(peptide.ampScore * 1.1, 0.99).toFixed(3)}</span>
              </div>
              <AnimatedProgressBar value={Math.min(peptide.ampScore * 1.1, 0.99)} delay={500} />
            </div>
          </div>

          {/* Warning box */}
          <div className="mt-5 p-3 rounded-[6px] bg-amber-50 border border-[#FCD34D] flex items-start gap-2">
            <AlertTriangle size={14} className="text-[#D97706] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[12px] text-[#92400E]">
                {t('common.computationalPrediction') as string}
              </p>
              <p className="text-[11px] text-[#B45309] mt-0.5">
                {t('common.computationalPredictionCN') as string}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Section 4: Amino Acid Composition + Model Details ── */}
      <div className="grid grid-cols-2 gap-6">
        {/* Amino Acid Composition Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-[#14B8A6]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">{t('detail.compositionTitle') as string}</h2>
          </div>

          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aaComposition} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="aa"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1F2937',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#fff',
                    padding: '6px 10px',
                  }}
                  formatter={(value: number) => [`${value}`, t('detail.count') as string]}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={20}>
                  {aaComposition.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[#F3F4F6]">
            {[
              { label: t('detail.aaPositive') as string, color: '#3B82F6' },
              { label: t('detail.aaNegative') as string, color: '#EF4444' },
              { label: t('detail.aaHydrophobic') as string, color: '#F59E0B' },
              { label: t('detail.aaPolar') as string, color: '#10B981' },
              { label: t('detail.aaSpecial') as string, color: '#9CA3AF' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-[#6B7280]">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI Model Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={16} className="text-[#14B8A6]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">{t('detail.modelDetailsTitle') as string}</h2>
          </div>

          <div className="space-y-0">
            {[
              { label: t('detail.modelName') as string, value: 'AMPGen-Demo v0.1' },
              { label: t('detail.scoringBackend') as string, value: 'XGBoost classifier + LSTM regressor' },
              { label: t('detail.structurePredictor') as string, value: 'AlphaFold2-lite (placeholder)' },
              {
                label: 'Generation Date',
                value: peptide.createdAt.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              },
              {
                label: 'Task Status',
                value: 'SUCCEEDED',
                badge: true,
                badgeClass: 'bg-emerald-50 text-[#10B981] border-[#10B981]',
              },
              {
                label: 'Pipeline Stage',
                value: 'Candidate Library',
                badge: true,
                badgeClass: 'bg-[#F0FDFA] text-[#14B8A6] border-[#14B8A6]',
              },
              { label: t('detail.confidence') as string, value: peptide.ampScore > 0.8 ? t('detail.high') as string : peptide.ampScore > 0.5 ? t('detail.medium') as string : t('detail.low') as string },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6] last:border-0"
              >
                <span className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                  {row.label}
                </span>
                {(row as { badge?: boolean; badgeClass?: string; value?: string }).badge ? (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${(row as { badgeClass?: string }).badgeClass}`}
                  >
                    {(row as { value?: string }).value}
                  </span>
                ) : (
                  <span className="text-[14px] font-medium text-[#111827]">{(row as { value?: string }).value}</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Section: Structure Placeholder ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
        className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Box size={16} className="text-[#14B8A6]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">{t('detail.structureTitle') as string}</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-[#6B7280] border border-[#E5E7EB]">
              {t('common.notImplemented') as string}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Helix Placeholder Graphic */}
          <div className="flex-shrink-0 w-[200px] h-[140px] bg-gradient-to-br from-[#F0FDFA] to-[#E0F2FE] rounded-[8px] border border-[#E5E7EB] flex items-center justify-center relative overflow-hidden">
            {/* Stylized helix representation */}
            <svg width="120" height="100" viewBox="0 0 120 100" fill="none" className="relative z-10">
              <path
                d="M10 80 Q 20 20, 30 50 T 50 50 T 70 50 T 90 50 T 110 20"
                stroke="#14B8A6"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M10 60 Q 20 0, 30 30 T 50 30 T 70 30 T 90 30 T 110 0"
                stroke="#5EEAD4"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="30" cy="50" r="4" fill="#14B8A6" />
              <circle cx="50" cy="50" r="4" fill="#14B8A6" />
              <circle cx="70" cy="50" r="4" fill="#14B8A6" />
              <circle cx="90" cy="50" r="4" fill="#14B8A6" />
              <circle cx="30" cy="30" r="3" fill="#5EEAD4" />
              <circle cx="50" cy="30" r="3" fill="#5EEAD4" />
              <circle cx="70" cy="30" r="3" fill="#5EEAD4" />
              <circle cx="90" cy="30" r="3" fill="#5EEAD4" />
            </svg>
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 left-4 w-8 h-8 border border-[#14B8A6] rounded-full" />
              <div className="absolute bottom-6 right-6 w-6 h-6 border border-[#14B8A6] rounded-full" />
              <div className="absolute top-1/2 right-4 w-4 h-4 bg-[#14B8A6] rounded-full" />
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <p className="text-[14px] text-[#111827]">
              {t('detail.structurePlaceholder') as string}
            </p>
            <p className="text-[13px] text-[#6B7280]">
              {t('detail.structurePlaceholderDesc') as string} ({secondaryStruct}).
            </p>
            <p className="text-[12px] text-[#9CA3AF] italic">
              {t('detail.expectedIntegration') as string}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Section 5: Notes Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} className="text-[#14B8A6]" />
          <h2 className="text-[16px] font-semibold text-[#111827]">Research Notes</h2>
        </div>

        {/* Existing Notes */}
        <div className="space-y-2 mb-4 max-h-[240px] overflow-y-auto pr-1">
          {/* Default note from peptide data */}
          {peptide.notes && (
            <div className="bg-[#F9FAFB] rounded-[6px] px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-semibold text-[#6B7280]">{t('common.system') as string}</span>
                <span className="text-[11px] text-[#9CA3AF]">{peptide.createdAt.toLocaleDateString()}</span>
              </div>
              <p className="text-[13px] text-[#111827]">{peptide.notes}</p>
            </div>
          )}

          {/* User-added notes */}
          {userNotes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#F9FAFB] rounded-[6px] px-3 py-2.5"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-semibold text-[#14B8A6]">{note.author}</span>
                <span className="text-[11px] text-[#9CA3AF]">{note.createdAt.toLocaleString()}</span>
              </div>
              <p className="text-[13px] text-[#111827]">{note.text}</p>
            </motion.div>
          ))}
        </div>

        {/* Add Note Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  addNote()
                }
              }}
              placeholder={t('detail.addNotePlaceholder') as string}
              className="w-full min-h-[60px] p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] text-[13px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#14B8A6] focus:ring-2 focus:ring-[rgba(20,184,166,0.1)] outline-none resize-y transition-all"
            />
          </div>
          <button
            onClick={addNote}
            disabled={!newNoteText.trim()}
            className="self-start h-[36px] px-4 rounded-[6px] text-[13px] font-medium bg-[#14B8A6] text-white hover:bg-[#0D9488] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('common.save') as string}
          </button>
        </div>
      </motion.div>

      {/* ── Section 6: Actions Row ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.55 }}
        className="flex flex-wrap items-center gap-3"
      >
        {/* Update Status */}
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[#6B7280]">{t('detail.updateStatus') as string}</span>
          <select
            value={statusValue || peptide.status}
            onChange={(e) => setStatusValue(e.target.value)}
            className="h-[36px] px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] text-[13px] text-[#111827] focus:border-[#14B8A6] outline-none cursor-pointer"
          >
            <option value="GENERATED">{t('library.statusNew') as string}</option>
            <option value="FILTERED">{t('library.statusSelected') as string}</option>
            <option value="CANDIDATE">{t('library.statusSynthesized') as string}</option>
            <option value="VALIDATED">{t('library.statusTested') as string}</option>
            <option value="REJECTED">{t('library.statusRejected') as string}</option>
          </select>
        </div>

        <div className="h-6 w-px bg-[#E5E7EB]" />

        <button
          onClick={exportFASTA}
          className="h-[36px] px-3 flex items-center gap-1.5 rounded-[6px] text-[13px] font-medium bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
        >
          <Download size={14} />
          {t('detail.exportFASTA') as string}
        </button>

        <button
          onClick={copySequence}
          className="h-[36px] px-3 flex items-center gap-1.5 rounded-[6px] text-[13px] font-medium bg-[#14B8A6] text-white hover:bg-[#0D9488] transition-colors"
        >
          {copiedSeq ? <Check size={14} /> : <Copy size={14} />}
          {copiedSeq ? t('detail.copied') as string : t('detail.copySequence') as string}
        </button>

        <button
          onClick={() => {
            /* synthesis list placeholder */
          }}
          className="h-[36px] px-3 flex items-center gap-1.5 rounded-[6px] text-[13px] font-medium bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
        >
          <Beaker size={14} />
          {t('detail.addToSynthesis') as string}
        </button>
      </motion.div>

      {/* ── Section 7: Scientific Disclaimer Banner ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="bg-[#FFFBEB] border border-[#FCD34D] rounded-[8px] p-4"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-[#D97706] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[14px] font-semibold text-[#92400E] mb-1">
              {t('detail.disclaimerCard') as string}
            </p>
            <p className="text-[13px] text-[#B45309]">
              {t('common.computationalPrediction') as string}
            </p>
            <p className="text-[12px] text-[#B45309] mt-1.5">
              {t('common.computationalPredictionCN') as string}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Structure Modal ── */}
      {showStructureModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowStructureModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-[12px] shadow-xl w-full max-w-[440px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-[#111827]">{t('detail.structureTitle') as string}</h3>
              <button
                onClick={() => setShowStructureModal(false)}
                className="p-1.5 rounded-[4px] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
              >
                {/* Close icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-[#F9FAFB] rounded-[8px] p-6 text-center">
              <Box size={40} className="text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-[14px] text-[#111827] font-medium mb-1">
                {t('detail.structurePlaceholder') as string}
              </p>
              <p className="text-[13px] text-[#6B7280]">
                {t('detail.structureModalDesc') as string}
              </p>
            </div>
            <button
              onClick={() => setShowStructureModal(false)}
              className="mt-4 w-full h-[36px] bg-[#14B8A6] text-white rounded-[6px] text-[13px] font-medium hover:bg-[#0D9488] transition-colors"
            >
              {t('common.cancel') as string}
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
