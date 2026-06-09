import { apiClient } from './client'
import type { PeptideCandidate } from './peptides'

export interface GenerationRun {
  id: number
  task_id?: number
  mode?: string
  backend?: string
  count: number
  min_length?: number
  max_length?: number
  temperature?: number
  top_p?: number
  status: string
  created_at: string
  completed_at?: string
}

export interface GenerationRunCreate {
  mode?: string
  backend?: 'SERVER_PRODUCTION'
  count?: number
  min_length?: number
  max_length?: number
  temperature?: number
  top_p?: number
}

export function listGenerationRuns(): Promise<GenerationRun[]> {
  return apiClient.get<GenerationRun[]>('/v1/generation-runs')
}

export function createGenerationRun(payload: GenerationRunCreate): Promise<GenerationRun> {
  return apiClient.post<GenerationRun>('/v1/generation-runs', payload)
}

export function getGenerationRun(runId: number): Promise<GenerationRun> {
  return apiClient.get<GenerationRun>(`/v1/generation-runs/${runId}`)
}

export function getGenerationRunPeptides(runId: number): Promise<GenerationRun & { peptides: PeptideCandidate[]; disclaimer: string }> {
  return apiClient.get(`/v1/generation-runs/${runId}/peptides`)
}

export interface ArtifactFile {
  name: string
  exists: boolean
  size_kb: number
  modified_at: string
  type: string
}

export interface GenerationRunArtifacts {
  artifact_dir: string | null
  files: ArtifactFile[]
  message: string
}

export function getGenerationRunArtifacts(runId: number): Promise<GenerationRunArtifacts> {
  return apiClient.get(`/v1/generation-runs/${runId}/artifacts`)
}
