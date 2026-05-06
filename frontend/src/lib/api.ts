const BASE_URL = import.meta.env.VITE_API_BASE_URL

type ApiResponse<T> = {
  data: T | null
  error: { message: string; code: string } | null
}

export async function api<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include', // wajib agar cookie session terkirim otomatis
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const json = await res.json()

  if (!res.ok) {
    return { data: null, error: json.error ?? { message: 'Unknown error', code: 'UNKNOWN' } }
  }

  return { data: json.data ?? json, error: null }
}