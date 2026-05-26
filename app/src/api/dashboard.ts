import { apiClient } from './client'

export interface DashboardSummary {
  peptides_total: number
  peptides_candidate: number
  peptides_filtered: number
  peptides_rejected: number
  tasks_total: number
  tasks_succeeded: number
  tasks_failed: number
  tasks_blocked: number
  tasks_running: number
  generation_runs_total: number
  local_demo_runs: number
  local_real_smoke_runs: number
  server_production_runs: number
  last_run_at: string | null
  disclaimer: string
}

export interface RecentRun {
  run_id: number
  task_id: number | null
  backend: string
  mode: string
  count: number
  status: string
  created_at: string | null
  completed_at: string | null
  peptide_count: number
  message: string
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiClient.get<DashboardSummary>('/v1/dashboard/summary')
}

export function getRecentRuns(limit = 5): Promise<RecentRun[]> {
  return apiClient.get<RecentRun[]>(`/v1/dashboard/recent-runs?limit=${limit}`)
}
