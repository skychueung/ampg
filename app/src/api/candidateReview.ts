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
