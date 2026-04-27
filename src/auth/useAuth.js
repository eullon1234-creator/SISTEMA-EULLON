import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../lib/firebase'

export function useAuth() {
  const configured = isFirebaseConfigured()
  const [user, setUser] = useState(null)
  const [hydrated, setHydrated] = useState(!configured)

  useEffect(() => {
    if (!configured || !auth) return

    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setHydrated(true)
    })

    return () => unsub()
  }, [configured])

  const loading = configured && !hydrated

  return { configured, user, loading }
}
