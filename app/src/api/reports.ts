const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api'

function _download(path: string, filename: string) {
  return fetch(`${BASE_URL}${path}`)
    .then((r) => {
      if (!r.ok) throw new Error(`Download failed: ${r.status}`)
      return r.blob()
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    })
}

export function exportCandidatesCsv(): Promise<void> {
  return _download('/v1/reports/candidates.csv', 'ampgen_candidates.csv')
}

export function exportCandidatesFasta(): Promise<void> {
  return _download('/v1/reports/candidates.fasta', 'ampgen_candidates.fasta')
}

export function exportTasksJson(): Promise<void> {
  return _download('/v1/reports/tasks.json', 'ampgen_tasks.json')
}

export function exportGenerationRunJson(runId: number): Promise<void> {
  return _download(`/v1/reports/generation-runs/${runId}.json`, `ampgen_run_${runId}_report.json`)
}

export function exportGenerationRunMarkdown(runId: number): Promise<void> {
  return _download(`/v1/reports/generation-runs/${runId}.md`, `ampgen_run_${runId}_report.md`)
}
