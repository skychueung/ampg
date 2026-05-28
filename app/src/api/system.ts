import { apiClient } from './client'

export interface RuntimeConfig {
  server_production_enabled: boolean
  server_production_max_count: number
  server_production_device: string
  server_artifact_dir: string
  local_real_smoke_device: string
  ampgen_root: string
  visualization_root: string
  mode: 'server' | 'local'
  disclaimer: string
}

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  return apiClient.get<RuntimeConfig>('/v1/system/runtime-config')
}
