const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_BASE = 'https://api.openai.com/v1'

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} [opts.model]
 * @param {string} [opts.baseUrl]
 * @param {object[]} opts.messages
 * @param {object[]} opts.tools
 * @param {(name: string, args: object) => unknown | Promise<unknown>} opts.onToolCall
 */
export async function runOpenAiToolLoop({
  apiKey,
  model = import.meta.env.VITE_OPENAI_MODEL || DEFAULT_MODEL,
  baseUrl = import.meta.env.VITE_OPENAI_BASE_URL || DEFAULT_BASE,
  messages,
  tools,
  onToolCall,
}) {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  /** @type {typeof messages} */
  let conversation = [...messages]

  for (;;) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: conversation,
        tools,
        tool_choice: 'auto',
      }),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg =
        json?.error?.message || json?.message || res.statusText || 'Erro na API de chat'
      throw new Error(msg)
    }

    const choice = json.choices?.[0]
    const assistantMsg = choice?.message
    if (!assistantMsg) {
      throw new Error('Resposta sem mensagem do modelo.')
    }

    conversation = [...conversation, assistantMsg]

    const toolCalls = assistantMsg.tool_calls
    if (!toolCalls?.length) {
      const text =
        typeof assistantMsg.content === 'string'
          ? assistantMsg.content
          : assistantMsg.content?.map((c) => c.text || '').join('') || ''
      return { text, messages: conversation }
    }

    for (const tc of toolCalls) {
      const fn = tc.function
      let args
      try {
        args = fn?.arguments ? JSON.parse(fn.arguments) : {}
      } catch {
        args = {}
      }
      const name = fn?.name || tc.name
      const payload = await onToolCall(name, args)
      conversation.push({
        role: 'tool',
        tool_call_id: tc.id,
        content:
          typeof payload === 'string' ? payload : JSON.stringify(payload ?? {}),
      })
    }
  }
}

export const OS_AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'os_snapshot',
      description:
        'Lê o estado atual do WebOS: página do desktop, janelas abertas, apps instalados e a lista my_projects (projetos em Meus Projetos / public/my-projects.json). Use antes de agir se precisar de contexto.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'os_open_internal',
      description:
        'Abre um app interno pelo internal_id (ex.: settings, ai-keys, ai-assistant, my-projects, notes, files).',
      parameters: {
        type: 'object',
        properties: {
          internal_id: {
            type: 'string',
            description: 'internalId do app',
          },
        },
        required: ['internal_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'os_open_app_by_name',
      description:
        'Abre um app pelo nome ou id (busca parcial, case-insensitive) na lista instalada.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Trecho do nome ou id' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'os_open_url_in_window',
      description: 'Abre uma URL em janela (iframe) dentro do WebOS.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          title: { type: 'string', description: 'Título da janela' },
          fullscreen: { type: 'boolean', description: 'Tela cheia se true' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'os_list_my_projects',
      description:
        'Lista os projetos cadastrados em Meus Projetos (ficheiro public/my-projects.json): id, nome, url, descrição. Use antes de os_open_my_project se não souber o id.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'os_open_my_project',
      description:
        'Abre um projeto dos Meus Projetos numa janela do WebOS (iframe). Preferir project_id (ex.: balanca-pro-plus); se não souber, use query com parte do nome.',
      parameters: {
        type: 'object',
        properties: {
          project_id: {
            type: 'string',
            description: 'id do projeto em my-projects.json',
          },
          query: {
            type: 'string',
            description: 'Busca parcial no nome ou id',
          },
          fullscreen: {
            type: 'boolean',
            description: 'Se true (padrão), abre em tela cheia',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'os_close_window',
      description: 'Fecha uma janela pelo id completo ou por sufixo/parte do id.',
      parameters: {
        type: 'object',
        properties: {
          window_id: { type: 'string' },
        },
        required: ['window_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'os_close_all_windows',
      description: 'Fecha todas as janelas abertas e volta ao desktop.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'os_set_desktop_page',
      description: 'Vai para uma página do desktop (ícones), índice base 0.',
      parameters: {
        type: 'object',
        properties: {
          page_index: { type: 'integer' },
        },
        required: ['page_index'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'os_next_desktop_page',
      description: 'Avança uma página de apps no desktop.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'os_prev_desktop_page',
      description: 'Volta uma página de apps no desktop.',
      parameters: { type: 'object', properties: {} },
    },
  },
]
