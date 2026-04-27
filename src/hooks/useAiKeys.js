import { useContext } from 'react'
import { AiKeysContext } from '../context/aiKeysContext'

export function useAiKeys() {
  const ctx = useContext(AiKeysContext)
  if (!ctx) {
    throw new Error('useAiKeys deve ser usado dentro de AiKeysProvider')
  }
  return ctx
}
