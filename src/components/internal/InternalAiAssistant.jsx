import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useDesktopAgent } from '../../hooks/useDesktopAgent'
import { useAiKeys } from '../../hooks/useAiKeys'
import {
  DEEPSEEK_DEFAULT_BASE,
  DEEPSEEK_FALLBACK_MODELS,
  OPENAI_DEFAULT_BASE,
  OPENAI_FALLBACK_MODELS,
  fetchOpenAiCompatibleModelIds,
  filterLikelyOpenAiChatModels,
  mergeModelSuggestions,
  normalizeChatBaseUrl,
} from '../../lib/openAiCompatibleModels'
import { OS_AGENT_TOOLS, runOpenAiToolLoop } from '../../lib/openAiToolsAgent'

const PREFS_KEY = 'eullon_webos_assistant_prefs_v1'

const SYSTEM = `Você é o assistente do WebOS Eullon. O usuário fala em português.
Ferramentas principais: os_snapshot (estado + apps + lista my_projects), abrir apps internos (os_open_internal), abrir app pelo nome (os_open_app_by_name), abrir URL (os_open_url_in_window), fechar janelas, mudar página do desktop.

A **Balança Pro+** está na área de trabalho como app (iframe). Para abrir: **os_open_app_by_name** com query "balança", "Balança" ou "Pro+", ou **os_open_url_in_window** com https://balanca-pro-plus.vercel.app/

Outros projetos (lista): **public/my-projects.json** e app **Meus Projetos** — **os_open_internal** com internal_id "my-projects". **os_list_my_projects** / **os_open_my_project** só servem para linhas desse JSON.

Se o utilizador disser "abre a balança", use **os_open_app_by_name** em primeiro lugar.
Use as ferramentas para ações na interface. Seja objetivo.
Nunca invente URLs ou ids: use os_list_my_projects ou os_snapshot.
Não solicite dados bancários nem execute código fora das ferramentas fornecidas.`

function loadPrefs() {
  try {
    const r = localStorage.getItem(PREFS_KEY)
    if (r) {
      const p = JSON.parse(r)
      const prov = p?.provider === 'openai' || p?.provider === 'deepseek' ? p.provider : 'deepseek'
      const model = typeof p?.model === 'string' ? p.model : ''
      return { provider: prov, model }
    }
  } catch {
    /* ignore */
  }
  return { provider: 'deepseek', model: '' }
}

export function InternalAiAssistant() {
  const initial = loadPrefs()
  const [provider, setProvider] = useState(initial.provider)
  const [modelId, setModelId] = useState(initial.model)
  const [modelOptions, setModelOptions] = useState([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsHint, setModelsHint] = useState(null)

  const { getApiKey, entries } = useAiKeys()
  const { runTool } = useDesktopAgent()
  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      content:
        'Olá. Escolha o modelo acima. Posso abrir apps, listar e abrir os seus projetos (Meus Projetos / my-projects.json), por exemplo: «abre a Balança Pro+» ou «lista os meus projetos».',
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)
  const modelListId = useId()

  const onToolCall = useCallback(
    async (name, args) => runTool(name, args ?? {}),
    [runTool],
  )

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ provider, model: modelId }))
  }, [provider, modelId])

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return

      const key =
        provider === 'deepseek' ? getApiKey('deepseek') : getApiKey('openai')
      const base =
        provider === 'deepseek'
          ? normalizeChatBaseUrl(
              import.meta.env.VITE_DEEPSEEK_BASE_URL,
              DEEPSEEK_DEFAULT_BASE,
            )
          : normalizeChatBaseUrl(
              import.meta.env.VITE_OPENAI_BASE_URL,
              OPENAI_DEFAULT_BASE,
            )
      const fallbacks =
        provider === 'deepseek' ? DEEPSEEK_FALLBACK_MODELS : OPENAI_FALLBACK_MODELS

      const pickModel = (options) => {
        setModelId((prev) => {
          const t = (prev || '').trim()
          if (t && options.includes(t)) return t
          return options[0] ?? ''
        })
      }

      if (!key) {
        setModelOptions(fallbacks)
        setModelsHint(
          'Cadastre a chave no app Chaves IA para carregar a lista completa de modelos da API.',
        )
        pickModel(fallbacks)
        return
      }

      setModelsLoading(true)
      setModelsHint(null)

      fetchOpenAiCompatibleModelIds(key, base)
        .then((ids) => {
          if (cancelled) return
          const merged =
            provider === 'deepseek'
              ? mergeModelSuggestions(ids, fallbacks)
              : mergeModelSuggestions(filterLikelyOpenAiChatModels(ids), fallbacks)
          const list = merged.length ? merged : fallbacks
          setModelOptions(list)
          pickModel(list)
        })
        .catch((e) => {
          if (cancelled) return
          setModelOptions(fallbacks)
          pickModel(fallbacks)
          setModelsHint(
            e instanceof Error
              ? e.message
              : 'Não foi possível listar modelos; você ainda pode digitar o id manualmente.',
          )
        })
        .finally(() => {
          if (!cancelled) setModelsLoading(false)
        })
    })

    return () => {
      cancelled = true
    }
  }, [provider, getApiKey, entries])

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return

    const key =
      provider === 'deepseek' ? getApiKey('deepseek') : getApiKey('openai')
    if (!key) {
      setError(
        provider === 'deepseek'
          ? 'Cadastre a chave DeepSeek no app Chaves IA (provedor DeepSeek).'
          : 'Cadastre a chave OpenAI no app Chaves IA (provedor OpenAI).',
      )
      return
    }

    const base =
      provider === 'deepseek'
        ? normalizeChatBaseUrl(
            import.meta.env.VITE_DEEPSEEK_BASE_URL,
            DEEPSEEK_DEFAULT_BASE,
          )
        : normalizeChatBaseUrl(
            import.meta.env.VITE_OPENAI_BASE_URL,
            OPENAI_DEFAULT_BASE,
          )

    const model =
      modelId.trim() ||
      (provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini')

    setError(null)
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setBusy(true)

    try {
      const historyForApi = [
        { role: 'system', content: SYSTEM },
        ...messages.map(({ role, content }) => ({ role, content })),
        { role: 'user', content: text },
      ]

      const { text: reply } = await runOpenAiToolLoop({
        apiKey: key,
        baseUrl: base,
        model,
        messages: historyForApi,
        tools: OS_AGENT_TOOLS,
        onToolCall,
      })

      setMessages((m) => [...m, { role: 'assistant', content: reply || '(sem texto)' }])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
      queueMicrotask(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        })
      })
    }
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col bg-slate-950">
      <div className="flex flex-col gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <label className="flex flex-col gap-1 text-slate-400">
            Provedor
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="min-w-[8rem] rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-white"
            >
              <option value="deepseek">DeepSeek</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-slate-400">
            Modelo (lista da API + sugestões; pode digitar outro id)
            <input
              list={modelListId}
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 font-mono text-sm text-white"
              placeholder={provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini'}
            />
            <datalist id={modelListId}>
              {modelOptions.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </label>
          {modelsLoading ? (
            <span className="pb-1 text-slate-500">Atualizando modelos…</span>
          ) : null}
        </div>
        {modelsHint ? (
          <p className="text-[11px] leading-snug text-amber-200/90">{modelsHint}</p>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[95%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'ml-auto bg-indigo-600 text-white'
                : 'mr-auto bg-slate-800/90 text-slate-100'
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      {error ? (
        <p className="px-3 pb-1 text-xs text-amber-300">{error}</p>
      ) : null}
      <form
        onSubmit={handleSend}
        className="flex shrink-0 gap-2 border-t border-white/10 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex.: Abre Ajustes e lista as janelas abertas"
          disabled={busy}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? '…' : 'Enviar'}
        </button>
      </form>
      <p className="px-3 pb-3 text-[10px] text-slate-500">
        DeepSeek: base padrão api.deepseek.com/v1 — override com VITE_DEEPSEEK_BASE_URL. OpenAI:
        VITE_OPENAI_BASE_URL. Modelos: GET /v1/models com sua chave.
      </p>
    </div>
  )
}
