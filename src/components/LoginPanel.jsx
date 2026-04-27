import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '../lib/firebase'

export function LoginPanel() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleSignIn(e) {
    e.preventDefault()
    if (!auth) return
    setLoading(true)
    setMessage(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Falha ao entrar.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    if (!auth) return
    setLoading(true)
    setMessage(null)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      setMessage('Conta criada. Se o projeto exigir verificação de e-mail, confira a caixa de entrada.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Falha ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="linux-workspace-bg flex min-h-dvh w-full flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm rounded-sm border border-[#3a3a3a] bg-[#2a2a2a] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <h1 className="text-center font-mono text-base font-semibold uppercase tracking-wide text-[#a8c8ff]">
          Entrar — Eullon GNU
        </h1>
        <p className="mt-1 text-center font-mono text-[10px] text-[#888]">
          Sessão única: os módulos internos podem usar o ID token do Firebase (Auth).
        </p>
        <form className="mt-6 flex flex-col gap-3" onSubmit={handleSignIn}>
          <label className="block font-mono text-[10px] font-medium uppercase tracking-wide text-[#9a9a9a]">
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-[#444] bg-[#1a1a1a] px-3 py-2 font-sans text-sm text-[#e8e8e8] outline-none focus:border-[#3584e4]"
            />
          </label>
          <label className="block font-mono text-[10px] font-medium uppercase tracking-wide text-[#9a9a9a]">
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-[#444] bg-[#1a1a1a] px-3 py-2 font-sans text-sm text-[#e8e8e8] outline-none focus:border-[#3584e4]"
            />
          </label>
          {message ? (
            <p className="font-mono text-[11px] text-amber-300/95">{message}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded border border-[#2a5a9a] bg-[#3584e4] py-2.5 font-mono text-sm font-medium text-white hover:bg-[#4a94f0] disabled:opacity-50"
          >
            {loading ? 'Aguarde…' : 'Entrar'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSignUp}
            className="rounded border border-[#444] py-2 font-mono text-sm text-[#bbb] hover:bg-[#333] disabled:opacity-50"
          >
            Criar conta
          </button>
        </form>
      </div>
    </div>
  )
}
