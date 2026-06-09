import { apiClient } from './client'

export interface PeptideCandidate {
  id: number
  sequence: string
  length: number
  net_charge?: number
  hydrophobic_fraction?: number
  hydrophobicity?: number
  valid_aa?: number
  amp_score?: number
  mic_ecoli?: number
  mic_saureus?: number
  toxicity_risk?: number
  hemolysis_risk?: number
  status: string
  source?: string
  generation_run_id?: number
  notes?: string
  created_at: string
  updated_at?: string
}

export interface PeptideUpdate {
  sequence?: string
  status?: string
  notes?: string
  amp_score?: number
  mic_ecoli?: number
  mic_saureus?: number
  toxicity_risk?: number
  hemolysis_risk?: number
}

export function listPeptides(status?: string): Promise<PeptideCandidate[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiClient.get<PeptideCandidate[]>(`/v1/peptides${qs}`)
}

export function getPeptide(peptideId: number): Promise<PeptideCandidate> {
  return apiClient.get<PeptideCandidate>(`/v1/peptides/${peptideId}`)
}

export function updatePeptide(peptideId: number, payload: PeptideUpdate): Promise<PeptideCandidate> {
  return apiClient.patch<PeptideCandidate>(`/v1/peptides/${peptideId}`, payload)
}

export function deletePeptide(peptideId: number): Promise<{ ok: boolean; disclaimer: string }> {
  return apiClient.delete(`/v1/peptides/${peptideId}`)
}
