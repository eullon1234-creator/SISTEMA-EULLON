import { useState } from 'react'
import { useAiKeys } from '../../hooks/useAiKeys'

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'google', label: 'Google AI' },
  { id: 'mistral', label: 'Mistral' },
  { id: 'cohere', label: 'Cohere' },
  { id: 'other', label: 'Outro' },
]

function maskKey(key) {
  if (!key || key.length < 6) return '••••'
  return `••••••••${key.slice(-4)}`
}

export function InternalAiKeysApp() {
  const { entries, loading, error, useCloud, addKey, removeKey } = useAiKeys()
  const [provider, setProvider] = useState('openai')
  const [label, setLabel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      await addKey({ provider, label, apiKey })
      setApiKey('')
      setLabel('')
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Não foi possível salvar a chave.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id) {
    if (!confirm('Remover esta chave?')) return
    try {
      await removeKey(id)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Não foi possível remover.',
      )
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 text-slate-200">
      <p className="text-xs leading-relaxed text-slate-400">
        Cadastre chaves de API para seus provedores de IA. Outros módulos podem usar{' '}
        <code className="rounded bg-slate-800 px-1 text-slate-200">useAiKeys()</code>{' '}
        (<code className="rounded bg-slate-800 px-1">getApiKey(&apos;openai&apos;)</code>
        ).
      </p>
      <p className="text-[11px] text-amber-200/80">
        {useCloud
          ? 'Armazenamento na nuvem (Firestore). Configure regras para que só o seu usuário leia/escreva.'
          : 'Modo local: chaves ficam neste navegador (localStorage). Faça login com Firebase para sincronizar na nuvem.'}
      </p>

      {error ? (
        <p className="rounded-lg bg-red-950/60 px-3 py-2 text-xs text-red-200">
          {error.message || String(error)}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3"
      >
        <span className="text-xs font-medium text-white">Nova chave</span>
        <label className="block text-[11px] text-slate-400">
          Provedor
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[11px] text-slate-400">
          Nome (opcional)
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex.: Produção"
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600"
          />
        </label>
        <label className="block text-[11px] text-slate-400">
          Chave API
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            autoComplete="off"
            placeholder="sk-… ou chave do provedor"
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600"
          />
        </label>
        {formError ? (
          <p className="text-xs text-amber-300">{formError}</p>
        ) : null}
        <button
          type="submit"
          disabled={saving || !apiKey.trim()}
          className="rounded-xl bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Adicionar chave'}
        </button>
      </form>

      <div className="min-h-0 flex-1">
        <h3 className="mb-2 text-xs font-medium text-slate-400">Chaves cadastradas</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Carregando…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma chave ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((row) => (
              <li
                key={row.id}
                className="flex items-start justify-between gap-2 rounded-xl border border-white/5 bg-slate-900/80 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {row.label || row.provider}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    {row.provider}
                  </p>
                  <p className="font-mono text-xs text-slate-400">
                    {maskKey(row.apiKey)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(row.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-950/50"
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
