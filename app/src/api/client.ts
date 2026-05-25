const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api'

async function _fetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...((options?.headers as Record<string, string>) || {}),
    },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string) => _fetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) => _fetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => _fetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => _fetch<T>(path, { method: 'DELETE' }),
}
