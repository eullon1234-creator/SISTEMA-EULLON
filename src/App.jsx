import { Desktop } from './components/Desktop'
import { LoginPanel } from './components/LoginPanel'
import { AiKeysProvider } from './context/AiKeysProvider'
import { DesktopAgentProvider } from './context/DesktopAgentProvider'
import { useAuth } from './auth/useAuth'

function LoadingScreen() {
  return (
    <div className="linux-workspace-bg flex min-h-dvh w-full items-center justify-center font-mono text-sm text-[#888]">
      Carregando sessão…
    </div>
  )
}

export default function App() {
  const { configured, user, loading } = useAuth()

  if (loading) return <LoadingScreen />

  if (configured && !user) {
    return <LoginPanel />
  }

  return (
    <AiKeysProvider userId={user?.uid ?? null}>
      <DesktopAgentProvider>
        <Desktop userEmail={user?.email ?? null} />
      </DesktopAgentProvider>
    </AiKeysProvider>
  )
}
