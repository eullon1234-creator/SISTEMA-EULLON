import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { AiKeysContext } from './aiKeysContext'

const LOCAL_STORAGE_KEY = 'eullon_webos_ai_api_keys_v1'

/**
 * @param {{ children: import('react').ReactNode, userId: string | null }} props
 */
export function AiKeysProvider({ children, userId }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const useCloud = Boolean(userId && db)

  useEffect(() => {
    if (useCloud) {
      const col = collection(db, 'users', userId, 'ai_api_keys')
      const unsub = onSnapshot(
        col,
        (snap) => {
          const list = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          list.sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? a.createdAt ?? 0
            const tb = b.createdAt?.toMillis?.() ?? b.createdAt ?? 0
            return tb - ta
          })
          setError(null)
          setEntries(list)
          setLoading(false)
        },
        (err) => {
          setError(err)
          setLoading(false)
        },
      )
      return () => unsub()
    }

    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
        setEntries(raw ? JSON.parse(raw) : [])
        setError(null)
      } catch (err) {
        setEntries([])
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [userId, useCloud])

  const addKey = useCallback(
    async ({ provider, label, apiKey }) => {
      const trimmed = apiKey.trim()
      if (!trimmed) return

      if (useCloud) {
        await addDoc(collection(db, 'users', userId, 'ai_api_keys'), {
          provider,
          label: label.trim() || provider,
          apiKey: trimmed,
          createdAt: serverTimestamp(),
        })
        return
      }

      setEntries((prev) => {
        const next = [
          ...prev,
          {
            id: crypto.randomUUID(),
            provider,
            label: label.trim() || provider,
            apiKey: trimmed,
            createdAt: Date.now(),
          },
        ]
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next))
        return next
      })
    },
    [useCloud, userId],
  )

  const removeKey = useCallback(
    async (id) => {
      if (useCloud) {
        await deleteDoc(doc(db, 'users', userId, 'ai_api_keys', id))
        return
      }
      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== id)
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next))
        return next
      })
    },
    [useCloud, userId],
  )

  const getApiKey = useCallback(
    (provider) => {
      const p = provider?.toLowerCase()
      const hit = entries.find((e) => e.provider?.toLowerCase() === p)
      return hit?.apiKey ?? undefined
    },
    [entries],
  )

  const getAnyApiKey = useCallback(() => entries[0]?.apiKey, [entries])

  const value = useMemo(
    () => ({
      entries,
      loading,
      error,
      useCloud,
      addKey,
      removeKey,
      getApiKey,
      getAnyApiKey,
    }),
    [
      entries,
      loading,
      error,
      useCloud,
      addKey,
      removeKey,
      getApiKey,
      getAnyApiKey,
    ],
  )

  return (
    <AiKeysContext.Provider value={value}>{children}</AiKeysContext.Provider>
  )
}
