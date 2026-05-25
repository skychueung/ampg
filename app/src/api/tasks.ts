import { apiClient } from './client'

export interface TaskRecord {
  id: number
  type: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'BLOCKED'
  progress: number
  total: number
  message?: string
  log_text?: string
  artifact_dir?: string
  created_at: string
  updated_at?: string
  completed_at?: string
  error_message?: string
}

export function listTasks(status?: string): Promise<TaskRecord[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiClient.get<TaskRecord[]>(`/v1/tasks${qs}`)
}

export function getTask(taskId: number): Promise<TaskRecord> {
  return apiClient.get<TaskRecord>(`/v1/tasks/${taskId}`)
}

export function getTaskLogs(taskId: number): Promise<{ task_id: number; logs: string[]; artifact_logs?: Record<string, string[]>; disclaimer: string }> {
  return apiClient.get(`/v1/tasks/${taskId}/logs`)
}

export function cancelTask(taskId: number): Promise<{ status: string; task_id: number; message: string; disclaimer?: string }> {
  return apiClient.post(`/v1/tasks/${taskId}/cancel`, {})
}
