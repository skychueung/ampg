import { apiClient } from './client'

export interface SequenceOverview {
  total_sequences: number
  unique_sequences: number
  duplicate_sequence_count: number
  near_duplicate_pairs: number
  average_length: number | null
  min_length: number | null
  max_length: number | null
  local_demo_count: number
  local_real_smoke_count: number
  disclaimer: string
}

export interface DuplicateGroup {
  sequence: string
  count: number
  peptide_ids: number[]
  sources: string[]
  statuses: string[]
}

export interface DuplicatesResponse {
  duplicate_groups: DuplicateGroup[]
  total_duplicate_sequences: number
  disclaimer: string
}

export interface SimilarityPair {
  peptide_id_1: number
  sequence_1: string
  peptide_id_2: number
  sequence_2: string
  similarity: number
  length_1: number
  length_2: number
  source_1: string | null
  source_2: string | null
}

export interface SimilarityResponse {
  threshold: number
  pairs: SimilarityPair[]
  pair_count: number
  disclaimer: string
}

export interface AAFrequency {
  aa: string
  count: number
  frequency: number
}

export interface PositionFrequency {
  position: number
  frequencies: AAFrequency[]
}

export interface DipeptideItem {
  motif: string
  count: number
  frequency: number
}

export interface MotifEnrichment {
  n_terminal_position_frequencies: PositionFrequency[]
  c_terminal_position_frequencies: PositionFrequency[]
  top_dipeptides: DipeptideItem[]
  top_amino_acids: AAFrequency[]
  disclaimer: string
}

export interface RepresentativePeptide {
  peptide_id: number
  sequence: string
  length: number
  net_charge: number | null
  hydrophobic_fraction: number | null
  status: string
  source: string | null
  representative_rank: number
  reason: string
}

export interface RepresentativesResponse {
  representatives: RepresentativePeptide[]
  disclaimer: string
}

export function getSequenceOverview(): Promise<SequenceOverview> {
  return apiClient.get('/v1/sequence-explorer/overview')
}

export function getDuplicateSequences(): Promise<DuplicatesResponse> {
  return apiClient.get('/v1/sequence-explorer/duplicates')
}

export function getSimilarityPairs(threshold = 0.8, limit = 100): Promise<SimilarityResponse> {
  return apiClient.get(`/v1/sequence-explorer/similarity?threshold=${threshold}&limit=${limit}`)
}

export function getMotifEnrichment(): Promise<MotifEnrichment> {
  return apiClient.get('/v1/sequence-explorer/motif-enrichment')
}

export function getRepresentativePeptides(limit = 10): Promise<RepresentativesResponse> {
  return apiClient.get(`/v1/sequence-explorer/representatives?limit=${limit}`)
}
