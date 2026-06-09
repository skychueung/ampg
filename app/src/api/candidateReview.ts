import { apiClient } from './client'

export interface EvidenceRule {
  passed: boolean
  value?: number
  target: string
}

export interface Evidence {
  length_rule: EvidenceRule
  charge_rule: EvidenceRule
  hydrophobic_rule: EvidenceRule
  valid_aa_rule: EvidenceRule
  source: string | null
  amp_score: number | null
  mic_ecoli: number | null
  mic_saureus: number | null
}

export interface CandidateEvidence {
  peptide_id: number
  sequence: string
  evidence: Evidence
  rule_based_recommendation: string
  reasons: string[]
  disclaimer: string
}

export interface ReviewPayload {
  review_status?: string
  priority?: string
  selected_for_synthesis?: boolean
  batch_label?: string
  review_notes?: string
}

export interface BatchReviewPayload {
  peptide_ids: number[]
  review_status?: string
  priority?: string
  selected_for_synthesis?: boolean
  batch_label?: string
}

export interface BatchReviewResult {
  updated_count: number
  skipped_ids: number[]
  disclaimer: string
}

export interface ReviewSummary {
  total_candidates: number
  unreviewed_count: number
  shortlisted_count: number
  rejected_by_review_count: number
  selected_for_synthesis_count: number
  high_priority_count: number
  local_real_smoke_shortlisted: number
  local_demo_shortlisted: number
  disclaimer: string
}

export interface CandidateFilters {
  status?: string
  source?: string
  review_status?: string
  priority?: string
  selected_for_synthesis?: boolean
  min_length?: number
  max_length?: number
  min_charge?: number
  max_charge?: number
  min_hydrophobic_fraction?: number
  max_hydrophobic_fraction?: number
  limit?: number
}

export function getReviewCandidates(filters: CandidateFilters = {}): Promise<any[]> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value))
    }
  })
  const qs = params.toString()
  return apiClient.get(`/v1/candidate-review/candidates${qs ? '?' + qs : ''}`)
}

export function getCandidateEvidence(peptideId: number): Promise<CandidateEvidence> {
  return apiClient.get(`/v1/candidate-review/candidates/${peptideId}/evidence`)
}

export function reviewCandidate(peptideId: number, payload: ReviewPayload): Promise<any> {
  return apiClient.post(`/v1/candidate-review/candidates/${peptideId}/review`, payload)
}

export function batchReviewCandidates(payload: BatchReviewPayload): Promise<BatchReviewResult> {
  return apiClient.post('/v1/candidate-review/batch-review', payload)
}

export function getShortlist(): Promise<any[]> {
  return apiClient.get('/v1/candidate-review/shortlist')
}

export function getReviewSummary(): Promise<ReviewSummary> {
  return apiClient.get('/v1/candidate-review/summary')
}

export function exportShortlistCsv(): Promise<Blob> {
  return fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api'}/v1/candidate-review/export-shortlist.csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => {
    if (!res.ok) throw new Error(`Export failed: ${res.status}`)
    return res.blob()
  })
}

export function exportShortlistFasta(): Promise<Blob> {
  return fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api'}/v1/candidate-review/export-shortlist.fasta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => {
    if (!res.ok) throw new Error(`Export failed: ${res.status}`)
    return res.blob()
  })
}

export function exportSynthesisOrderCsv(): Promise<Blob> {
  return fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api'}/v1/candidate-review/export-synthesis-order.csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => {
    if (!res.ok) throw new Error(`Export failed: ${res.status}`)
    return res.blob()
  })
}

/* ------------------------------------------------------------------ */
/*  P6F Combined Shortlist                                            */
/* ------------------------------------------------------------------ */

export interface P6FShortlistItem {
  rank: number
  sequence: string
  length: number
  amp_score: number | null
  amp_like: number | null
  mic_saureus: number | null
  mic_saureus_logmic: number | null
  mic_ecoli: string | null
  combined_rank_score: number | null
  net_charge_approx: number | null
  hydrophobic_fraction: number | null
  run_id: string | null
  batch_id: string | null
  peptide_id: string | null
  source_group: string | null
  source: string | null
}

export interface P6FShortlistResponse {
  type: string
  count: number
  items: P6FShortlistItem[]
  source_label: string
  disclaimer: string
  metadata?: {
    available_types: string[]
    total_rows: number
    columns: string[]
    generated_at: string
    source_manifest: string
  }
}

export function getP6FShortlist(type: string): Promise<P6FShortlistResponse> {
  return apiClient.get(`/v1/candidate-review/p6f-shortlist?type=${encodeURIComponent(type)}`)
}

export function exportP6FShortlistCsv(
  items: P6FShortlistItem[],
  filename?: string,
  options?: { filtered?: boolean; type?: string; disclaimer?: string }
): void {
  const headers = [
    'rank', 'sequence', 'length', 'amp_score', 'mic_saureus', 'mic_ecoli',
    'combined_rank_score', 'net_charge_approx', 'hydrophobic_fraction',
    'run_id', 'batch_id', 'source_group', 'source',
    'scientific_disclaimer',
  ]
  const rows = items.map((item) =>
    headers.map((h) => {
      if (h === 'scientific_disclaimer') {
        const d = options?.disclaimer || 'Computational prediction only; not experimentally validated.'
        return `"${d.replace(/"/g, '""')}"`
      }
      const val = (item as any)[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )
  const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const typeLabel = options?.type || 'shortlist'
  const filterLabel = options?.filtered ? 'filtered' : 'full'
  a.download = filename || `ampgen_${typeLabel}_${filterLabel}_${ts}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function copyAllSequences(items: P6FShortlistItem[]): Promise<void> {
  const text = items.map((item) => item.sequence).join('\n')
  return navigator.clipboard.writeText(text)
}
