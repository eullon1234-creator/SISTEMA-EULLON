import { useContext } from 'react'
import { DesktopAgentContext } from '../context/desktopAgentContext'

export function useDesktopAgent() {
  const ctx = useContext(DesktopAgentContext)
  if (!ctx) {
    throw new Error('useDesktopAgent deve estar dentro de DesktopAgentProvider')
  }
  return ctx
}
