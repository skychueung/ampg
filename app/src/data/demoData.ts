/**
 * AMPGen Agent Platform — Demo Data Layer
 *
 * CRITICAL: All peptide sequences, scores, and predictions in this file
 * are COMPUTATIONAL DEMO DATA. They are NOT experimentally validated.
 *
 * DISCLAIMER: "All scores and predictions shown are computational/demo data
 * and have NOT been experimentally validated."
 */

export const DISCLAIMER =
  'All scores and predictions shown are computational/demo data and have NOT been experimentally validated.'

export const DEMO_BANNER_TEXT =
  'Demo Data, Not experimentally validated'

export interface PeptideCandidate {
  id: number
  sequence: string
  length: number
  netCharge: number
  hydrophobicity: number
  ampScore: number
  micScore: number
  toxicityRisk: number
  hemolysisRisk: number
  status: 'GENERATED' | 'FILTERED' | 'CANDIDATE' | 'VALIDATED' | 'REJECTED'
  notes: string
  createdAt: Date
}

export interface TaskRecord {
  id: number
  type: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'BLOCKED'
  progress: number
  total: number
  createdAt: Date
  completedAt?: Date
  errorMessage?: string
}

// --- Realistic amino acid distribution for AMPs (alpha-helical) ---
const AMP_AA_POOL = 'AAAKKLLFFIIWWGGNNRRHHCCSSQQDDEEYYVVMMPPTT'.split('')

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateSequence(length: number): string {
  let seq = ''
  for (let i = 0; i < length; i++) {
    seq += AMP_AA_POOL[randomInt(0, AMP_AA_POOL.length - 1)]
  }
  return seq
}

function computeNetCharge(sequence: string): number {
  // Count basic (K, R, H) and acidic (D, E) residues
  let charge = 0
  for (const aa of sequence) {
    if ('KRH'.includes(aa)) charge += 1
    else if ('DE'.includes(aa)) charge -= 1
  }
  return charge
}

function computeHydrophobicity(sequence: string): number {
  // Normalized GRAVY-like score
  const hydrophobic: Record<string, number> = {
    A: 0.5, V: 1.0, I: 1.5, L: 1.5, M: 0.5, F: 2.0, W: 2.5, Y: 1.5,
    C: 0.5, P: -0.5, G: 0, S: -0.5, T: -0.5, N: -1.0, Q: -1.0,
    H: -0.5, K: -2.0, R: -2.0, D: -1.5, E: -1.5,
  }
  let total = 0
  for (const aa of sequence) {
    total += hydrophobic[aa] ?? 0
  }
  return Number((total / sequence.length).toFixed(2))
}

// --- Generate 312 demo peptide candidates ---
const candidates: PeptideCandidate[] = []

// Pre-set counts per status for consistent dashboard numbers
const STATUS_COUNTS: Record<string, number> = {
  GENERATED: 1247,
  FILTERED: 312,
  CANDIDATE: 89,
  VALIDATED: 23,
  REJECTED: 812,
}

// Only store the first 312 as detail records
const NUM_STORED = 312
const TARGET_STATUS_DIST: PeptideCandidate['status'][] = [
  ...Array(89).fill('CANDIDATE' as const),
  ...Array(23).fill('VALIDATED' as const),
  ...Array(100).fill('FILTERED' as const),
  ...Array(100).fill('GENERATED' as const),
]

// Unused in current version — reserved for future sampling
// const STATUS_POOL: PeptideCandidate['status'][] = ['GENERATED', 'FILTERED', 'CANDIDATE', 'VALIDATED', 'REJECTED']

// Pre-generate realistic demo notes
const NOTES_POOL = [
  'Passes physicochemical filter. High cationic charge.',
  'Alpha-helical propensity predicted by AGADIR.',
  'Low hemolysis risk predicted (HLP < 0.15).',
  'Moderate toxicity — requires experimental validation.',
  'Strong AMP prediction (score > 0.85). MIC against E. coli estimated.',
  'High hydrophobic moment — potential membrane disruptor.',
  'Sequence contains tryptophan-rich N-terminus.',
  'Low charge density — may have weak antimicrobial activity.',
  'Passes all in-silico filters. Ready for experimental validation.',
  'Synthetic feasibility: moderate. Contains rare amino acid pairings.',
  'Predicted to form beta-sheet structure.',
  'High hemolysis risk — rejected from candidate pool.',
  'Candidate for further optimization via EvoDiff-Small.',
  'Broad-spectrum prediction based on physicochemical profile.',
]

for (let i = 1; i <= NUM_STORED; i++) {
  const length = randomInt(10, 50)
  const sequence = generateSequence(length)
  const netCharge = computeNetCharge(sequence)
  const hydrophobicity = computeHydrophobicity(sequence)

  // Derive scores from physicochemical properties (demo calculations)
  const chargeFactor = Math.min(Math.max((netCharge + 5) / 10, 0), 1)
  const hydroFactor = Math.min(Math.max(1 - Math.abs(hydrophobicity - 0.4) / 1.0, 0), 1)
  const baseAmpScore = Number((chargeFactor * 0.4 + hydroFactor * 0.3 + Math.random() * 0.3).toFixed(3))
  const ampScore = Math.min(Math.max(baseAmpScore, 0.05), 0.99)

  const micScore = ampScore > 0.5 ? Number((ampScore * (0.7 + Math.random() * 0.3)).toFixed(3)) : Number((ampScore * Math.random()).toFixed(3))
  const toxicityRisk = Number((Math.random() * (1 - ampScore * 0.5)).toFixed(3))
  const hemolysisRisk = Number((Math.random() * (1.1 - ampScore)).toFixed(3))

  const statusIndex = (i - 1) % TARGET_STATUS_DIST.length
  const status = TARGET_STATUS_DIST[statusIndex]

  candidates.push({
    id: i,
    sequence,
    length,
    netCharge,
    hydrophobicity,
    ampScore,
    micScore,
    toxicityRisk,
    hemolysisRisk,
    status,
    notes: NOTES_POOL[randomInt(0, NOTES_POOL.length - 1)],
    createdAt: new Date(Date.now() - randomInt(0, 30 * 24 * 60 * 60 * 1000)),
  })
}

// Sort: CANDIDATE first, then VALIDATED, FILTERED, GENERATED, REJECTED
const STATUS_ORDER: Record<string, number> = {
  CANDIDATE: 0,
  VALIDATED: 1,
  FILTERED: 2,
  GENERATED: 3,
  REJECTED: 4,
}
candidates.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])

export const DEMO_PEPTIDES: PeptideCandidate[] = candidates

// --- Demo Task Records ---
export const DEMO_TASKS: TaskRecord[] = [
  {
    id: 1291,
    type: 'AMP Generation',
    status: 'RUNNING',
    progress: 45,
    total: 100,
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: 1290,
    type: 'Physicochemical Filter',
    status: 'SUCCEEDED',
    progress: 100,
    total: 100,
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
    completedAt: new Date(Date.now() - 10 * 60 * 1000),
  },
  {
    id: 1289,
    type: 'AMP Discriminator',
    status: 'SUCCEEDED',
    progress: 312,
    total: 312,
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 55 * 60 * 1000),
  },
  {
    id: 1288,
    type: 'MIC Scoring',
    status: 'FAILED',
    progress: 0,
    total: 89,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 1.9 * 60 * 60 * 1000),
    errorMessage: 'GPU memory exhausted during inference',
  },
  {
    id: 1287,
    type: 'AMP Generation',
    status: 'SUCCEEDED',
    progress: 500,
    total: 500,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
  },
  {
    id: 1286,
    type: 'AMP Discriminator',
    status: 'PENDING',
    progress: 0,
    total: 200,
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: 1285,
    type: 'Filter',
    status: 'SUCCEEDED',
    progress: 500,
    total: 500,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 3.8 * 60 * 60 * 1000),
  },
]

// --- Helper functions ---

export function getPeptideById(id: number): PeptideCandidate | undefined {
  return DEMO_PEPTIDES.find((p) => p.id === id)
}

export function getPeptidesByStatus(status: PeptideCandidate['status']): PeptideCandidate[] {
  return DEMO_PEPTIDES.filter((p) => p.status === status)
}

export function getAllPeptides(): PeptideCandidate[] {
  return DEMO_PEPTIDES
}

export function countByStatus(): Record<string, number> {
  const counts: Record<string, number> = {
    GENERATED: STATUS_COUNTS.GENERATED,
    FILTERED: STATUS_COUNTS.FILTERED,
    CANDIDATE: STATUS_COUNTS.CANDIDATE,
    VALIDATED: STATUS_COUNTS.VALIDATED,
    REJECTED: STATUS_COUNTS.REJECTED,
  }
  return counts
}

export function getRecentTasks(limit: number = 5): TaskRecord[] {
  return [...DEMO_TASKS].sort((a, b) => b.id - a.id).slice(0, limit)
}

export function getTaskById(id: number): TaskRecord | undefined {
  return DEMO_TASKS.find((t) => t.id === id)
}

export function createTask(type: string, total: number): TaskRecord {
  const newTask: TaskRecord = {
    id: Math.max(...DEMO_TASKS.map((t) => t.id)) + 1,
    type,
    status: 'PENDING',
    progress: 0,
    total,
    createdAt: new Date(),
  }
  DEMO_TASKS.push(newTask)
  return newTask
}

export function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}
