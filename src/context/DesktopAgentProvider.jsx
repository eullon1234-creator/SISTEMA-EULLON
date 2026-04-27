import { useCallback, useMemo, useRef } from 'react'
import { DesktopAgentContext } from './desktopAgentContext'

/**
 * Conecta o assistente de IA às ações reais do Desktop (via ref imperativo).
 */
export function DesktopAgentProvider({ children }) {
  const apiRef = useRef(null)

  const setAgentApi = useCallback((api) => {
    apiRef.current = api
  }, [])

  const runTool = useCallback((name, args) => {
    const api = apiRef.current
    if (!api?.runTool) {
      return { ok: false, error: 'Desktop ainda não está pronto. Aguarde um instante.' }
    }
    try {
      return api.runTool(name, args ?? {})
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      }
    }
  }, [])

  const getSnapshot = useCallback(() => {
    return apiRef.current?.getSnapshot?.() ?? null
  }, [])

  const value = useMemo(
    () => ({ setAgentApi, runTool, getSnapshot }),
    [setAgentApi, runTool, getSnapshot],
  )

  return (
    <DesktopAgentContext.Provider value={value}>
      {children}
    </DesktopAgentContext.Provider>
  )
}
