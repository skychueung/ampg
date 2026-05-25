export function downloadReportCsv(): Promise<Blob> {
  return fetch(`${(import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api')}/v1/reports/candidates.csv`)
    .then((r) => {
      if (!r.ok) throw new Error(`Download failed: ${r.status}`)
      return r.blob()
    })
}

export function downloadReportFasta(): Promise<Blob> {
  return fetch(`${(import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api')}/v1/reports/candidates.fasta`)
    .then((r) => {
      if (!r.ok) throw new Error(`Download failed: ${r.status}`)
      return r.blob()
    })
}
