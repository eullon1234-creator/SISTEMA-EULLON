/** Base padrão da API compatível com OpenAI (DeepSeek). */
export const DEEPSEEK_DEFAULT_BASE = 'https://api.deepseek.com/v1'

/**
 * Garante sufixo `/v1` para rotas tipo OpenAI (`/chat/completions`, `/models`).
 * @param {string} [raw] valor de env (pode ser sem /v1)
 * @param {string} fallback base completa padrão
 */
export function normalizeChatBaseUrl(raw, fallback) {
  const s = String(raw || '').trim()
  const b = (s || fallback).replace(/\/$/, '')
  if (/\/v1$/i.test(b)) return b
  return `${b}/v1`
}

/** Base padrão OpenAI. */
export const OPENAI_DEFAULT_BASE = 'https://api.openai.com/v1'

/**
 * Lista estática de fallback (caso GET /models falhe ou retorne vazio).
 * A API oficial também pode expor outros ids — use o carregamento dinâmico.
 */
export const DEEPSEEK_FALLBACK_MODELS = [
  'deepseek-chat',
  'deepseek-reasoner',
  'deepseek-v4-flash',
  'deepseek-v4-pro',
]

export const OPENAI_FALLBACK_MODELS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1',
  'gpt-4.1-mini',
  'o4-mini',
]

/**
 * @param {string} apiKey
 * @param {string} baseUrl ex.: https://api.deepseek.com/v1
 * @returns {Promise<string[]>}
 */
export async function fetchOpenAiCompatibleModelIds(apiKey, baseUrl) {
  const base = (baseUrl || '').replace(/\/$/, '')
  if (!base || !apiKey) return []

  const url = `${base}/models`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      json?.error?.message || json?.message || res.statusText || `HTTP ${res.status}`
    throw new Error(msg)
  }
  const rows = Array.isArray(json?.data) ? json.data : []
  return rows.map((r) => r.id).filter(Boolean)
}

export function mergeModelSuggestions(apiIds, fallbacks) {
  const set = new Set([...(fallbacks || []), ...(apiIds || [])])
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

/** Remove ids que normalmente não são chat no endpoint /v1/chat/completions */
export function filterLikelyOpenAiChatModels(ids) {
  return ids.filter(
    (id) =>
      !/embed|tts|whisper|dall-e|moderation|davinci|babbage|ada|curie|transcribe|realtime|text-moderation|omni-moderation|audio|speech|image|video|sora/i.test(
        id,
      ),
  )
}
