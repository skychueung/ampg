import { apiClient } from './client'

export interface ServerBatchCreatePayload {
  batch_name: string
  total_count: number
  backend?: string
  mode?: string
  min_length?: number
  max_length?: number
  temperature?: number
  top_p?: number
}

export interface ServerBatchItem {
  id: number
  batch_id: number
  chunk_index: number
  generation_run_id: number | null
  task_id: number | null
  requested_count: number
  generated_count: number
  status: string
  artifact_dir: string | null
  message: string | null
  created_at: string
  completed_at: string | null
}

export interface ServerBatch {
  id: number
  batch_name: string | null
  backend: string
  total_count: number
  chunk_size: number
  total_chunks: number
  completed_chunks: number
  failed_chunks: number
  status: string
  message: string | null
  artifact_root: string | null
  mode: string | null
  min_length: number | null
  max_length: number | null
  temperature: number | null
  top_p: number | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface ServerBatchDetail extends ServerBatch {
  items: ServerBatchItem[]
}

export interface ServerBatchPeptides {
  batch_id: number
  total_peptides: number
  peptides: Array<Record<string, any>>
  disclaimer: string
}

export interface ServerBatchArtifacts {
  batch_id: number
  artifact_root: string | null
  chunks: Array<Record<string, any>>
  message: string
}

export async function createServerBatch(payload: ServerBatchCreatePayload): Promise<ServerBatch> {
  return apiClient.post<ServerBatch>('/v1/server-batches', payload)
}

export async function listServerBatches(): Promise<ServerBatch[]> {
  return apiClient.get<ServerBatch[]>('/v1/server-batches')
}

export async function getServerBatch(batchId: number): Promise<ServerBatchDetail> {
  return apiClient.get<ServerBatchDetail>(`/v1/server-batches/${batchId}`)
}

export async function getServerBatchPeptides(batchId: number): Promise<ServerBatchPeptides> {
  return apiClient.get<ServerBatchPeptides>(`/v1/server-batches/${batchId}/peptides`)
}

export async function getServerBatchArtifacts(batchId: number): Promise<ServerBatchArtifacts> {
  return apiClient.get<ServerBatchArtifacts>(`/v1/server-batches/${batchId}/artifacts`)
}

export async function cancelServerBatch(batchId: number): Promise<{ status: string; message: string }> {
  return apiClient.post<{ status: string; message: string }>(`/v1/server-batches/${batchId}/cancel`, {})
}
