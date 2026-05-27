import { apiClient } from './client'

export interface StorageSummary {
  database_path: string
  database_exists: boolean
  database_size_mb: number
  artifact_dir: string
  artifact_dir_exists: boolean
  artifact_size_mb: number
  artifact_file_count: number
  backup_dir: string
  backup_count: number
  latest_backup: string | null
  peptide_count: number
  task_count: number
  reviewed_count: number
  shortlisted_count: number
  selected_for_synthesis_count: number
  disclaimer: string
}

export interface BackupItem {
  filename: string
  path: string
  size_mb: number
  created_at: string
}

export interface BackupsList {
  db_backups: BackupItem[]
  artifact_backups: BackupItem[]
  snapshots: BackupItem[]
}

export interface BackupResult {
  backup_path: string
  size_mb: number
  created_at: string
}

export interface SnapshotResult {
  snapshot_path: string
  size_mb: number
  created_at: string
  manifest: Record<string, any>
}

export interface RestoreResult {
  status: string
  message: string
  backup_path?: string
  pre_restore_backup?: string
}

export interface CleanupResult {
  dry_run: boolean
  files_to_delete: number
  total_size_mb: number
  older_than_days: number
  message: string
}

export interface ResetDemoResult {
  status: string
  message: string
  deleted_count: number
  pre_reset_backup?: string
}

export function getStorageSummary(): Promise<StorageSummary> {
  return apiClient.get('/v1/maintenance/storage-summary')
}

export function backupDatabase(): Promise<BackupResult> {
  return apiClient.post('/v1/maintenance/backup-database', {})
}

export function backupArtifacts(): Promise<BackupResult> {
  return apiClient.post('/v1/maintenance/backup-artifacts', {})
}

export function createProjectSnapshot(): Promise<SnapshotResult> {
  return apiClient.post('/v1/maintenance/create-project-snapshot', {})
}

export function listBackups(): Promise<BackupsList> {
  return apiClient.get('/v1/maintenance/backups')
}

export function restoreDatabase(payload: { backup_filename: string; confirm: boolean }): Promise<RestoreResult> {
  return apiClient.post('/v1/maintenance/restore-database', payload)
}

export function cleanupArtifacts(payload: { older_than_days: number; dry_run: boolean }): Promise<CleanupResult> {
  return apiClient.post('/v1/maintenance/cleanup-artifacts', payload)
}

export function resetDemoData(payload: { confirm: boolean; include_real_runs: boolean; include_review_data: boolean }): Promise<ResetDemoResult> {
  return apiClient.post('/v1/maintenance/reset-demo-data', payload)
}
