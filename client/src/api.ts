import { supabase } from './supabase'

async function getToken(): Promise<string | undefined> {
  if (!supabase) return undefined
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = await getToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  })
  if (res.status === 401) {
    await supabase?.auth.signOut()
    throw new Error('Session expirée, veuillez vous reconnecter')
  }
  if (!res.ok) {
    let message = `Erreur ${res.status}`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  del: (url: string) => request<void>(url, { method: 'DELETE' }),
}

export async function downloadAuth(url: string, filename: string): Promise<void> {
  const token = await getToken()
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
