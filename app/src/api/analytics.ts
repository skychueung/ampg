import { apiClient } from './client'

export interface PeptideSummary {
  total_peptides: number
  valid_aa_count: number
  invalid_aa_count: number
  candidate_count: number
  filtered_count: number
  rejected_count: number
  local_demo_count: number
  local_real_smoke_count: number
  average_length: number | null
  average_net_charge: number | null
  average_hydrophobic_fraction: number | null
  not_computed_amp_score_count: number
  not_computed_mic_count: number
  disclaimer: string
}

export interface DistributionBin {
  bin: string
  count: number
}

export interface PropertyDistributions {
  length_distribution: DistributionBin[]
  charge_distribution: DistributionBin[]
  hydrophobic_fraction_distribution: DistributionBin[]
  disclaimer: string
}

export interface AminoAcidCompositionItem {
  aa: string
  count: number
  frequency: number
}

export interface AminoAcidComposition {
  total_residues: number
  invalid_residues: number
  composition: AminoAcidCompositionItem[]
  disclaimer: string
}

export interface StatusCount {
  status: string
  count: number
}

export interface SourceCount {
  source: string
  count: number
}

export interface BackendCount {
  backend: string
  count: number
}

export interface StatusSourceBreakdown {
  status_counts: StatusCount[]
  source_counts: SourceCount[]
  backend_counts: BackendCount[]
  disclaimer: string
}

export interface FilterRule {
  rule: string
  label: string
  passed: number
  failed: number
  pass_rate: number
}

export interface FilterRulePassRate {
  rules: FilterRule[]
  disclaimer: string
}

export interface TopCandidate {
  id: number
  sequence: string
  length: number
  net_charge: number | null
  hydrophobic_fraction: number | null
  valid_aa: number | null
  status: string
  source: string | null
  generation_run_id: number | null
  rule_based_rank: number
  rule_based_reason: string
  amp_score: number | null
  mic_ecoli: number | null
  mic_saureus: number | null
}

export interface TopCandidates {
  candidates: TopCandidate[]
  total: number
  disclaimer: string
}

// ---------------------------------------------------------------------------
// v0.5.6 Run Comparison
// ---------------------------------------------------------------------------

export interface GenerationRunSummaryItem {
  id: number
  task_id: number | null
  mode: string | null
  backend: string | null
  status: string
  count: number
  created_at: string
  completed_at: string | null
}

export interface GenerationRunsSummary {
  runs: GenerationRunSummaryItem[]
  total: number
  disclaimer: string
}

export interface GenerationRunAnalytics {
  run_id: number
  total_peptides: number
  avg_length: number | null
  avg_net_charge: number | null
  avg_hydrophobic_fraction: number | null
  status_counts: StatusCount[]
  amino_acid_composition: AminoAcidCompositionItem[]
  filter_rule_pass_rate: FilterRule[]
  disclaimer: string
}

export interface RunCompareItem {
  run_id: number
  run_info: GenerationRunSummaryItem
  total_peptides: number
  avg_length: number | null
  avg_net_charge: number | null
  avg_hydrophobic_fraction: number | null
  candidate_count: number
  filtered_count: number
  rejected_count: number
  length_distribution: DistributionBin[]
  status_counts: StatusCount[]
}

export interface GenerationRunsCompare {
  compared_runs: RunCompareItem[]
  disclaimer: string
}

export function getPeptidesSummary(): Promise<PeptideSummary> {
  return apiClient.get('/v1/analytics/peptides-summary')
}

export function getPropertyDistributions(): Promise<PropertyDistributions> {
  return apiClient.get('/v1/analytics/property-distributions')
}

export function getAminoAcidComposition(): Promise<AminoAcidComposition> {
  return apiClient.get('/v1/analytics/amino-acid-composition')
}

export function getStatusSourceBreakdown(): Promise<StatusSourceBreakdown> {
  return apiClient.get('/v1/analytics/status-source-breakdown')
}

export function getFilterRulePassRate(): Promise<FilterRulePassRate> {
  return apiClient.get('/v1/analytics/filter-rule-pass-rate')
}

export function getTopCandidates(limit = 10): Promise<TopCandidates> {
  return apiClient.get(`/v1/analytics/top-candidates?limit=${limit}`)
}

// v0.5.6
export function getGenerationRunsSummary(): Promise<GenerationRunsSummary> {
  return apiClient.get('/v1/analytics/generation-runs-summary')
}

export function getGenerationRunAnalytics(runId: number): Promise<GenerationRunAnalytics> {
  return apiClient.get(`/v1/analytics/generation-runs/${runId}/analytics`)
}

export function compareGenerationRuns(runIds: number[]): Promise<GenerationRunsCompare> {
  return apiClient.post('/v1/analytics/generation-runs/compare', { run_ids: runIds })
}
