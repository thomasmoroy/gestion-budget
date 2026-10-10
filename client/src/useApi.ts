import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .get<T>(url)
      .then((d) => {
        if (alive) {
          setData(d)
          setError('')
        }
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'Erreur')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [url, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload }
}
