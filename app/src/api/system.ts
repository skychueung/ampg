import { apiClient } from './client'

export interface AmpgenProbeResult {
  ampgen_root: string
  exists: boolean
  items: Record<string, boolean>
  all_present: boolean
  disclaimer: string
}

export function probeAmpgen(): Promise<AmpgenProbeResult> {
  return apiClient.get<AmpgenProbeResult>('/v1/system/ampgen-probe')
}
