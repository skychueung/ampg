import { apiClient } from './client'

export interface RuntimeConfig {
  server_production_enabled: boolean
  server_production_max_count: number
  server_production_device: string
  server_artifact_dir: string
  local_real_smoke_device: string
  ampgen_root: string
  visualization_root: string
  server_batch_enabled: boolean
  server_batch_max_total_count: number
  server_batch_chunk_size: number
  server_batch_max_concurrency: number
  server_production_single_run_limit?: number
  mode: 'server' | 'local'
  disclaimer: string
}

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  return apiClient.get<RuntimeConfig>('/v1/system/runtime-config')
}
