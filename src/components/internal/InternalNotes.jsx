import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'eullon_webos_notes_v1'

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data
      .filter((x) => x && typeof x.id === 'string')
      .map((x) => ({
        id: x.id,
        title: typeof x.title === 'string' ? x.title : '',
        body: typeof x.body === 'string' ? x.body : '',
        updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : Date.now(),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function InternalNotes() {
  const [notes, setNotes] = useState(loadNotes)
  const [selectedId, setSelectedId] = useState(() => notes[0]?.id ?? null)
  const [query, setQuery] = useState('')
  const saveTimer = useRef(null)

  const persist = useCallback((list) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null
      saveNotes(list)
    }, 250)
  }, [])

  useEffect(() => {
    persist(notes)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [notes, persist])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q),
    )
  }, [notes, query])

  const selected = notes.find((n) => n.id === selectedId) ?? null

  const touch = useCallback((id, patch) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
      ),
    )
  }, [])

  const addNote = useCallback(() => {
    const id = newId()
    const note = {
      id,
      title: 'Sem título',
      body: '',
      updatedAt: Date.now(),
    }
    setNotes((prev) => [note, ...prev])
    setSelectedId(id)
  }, [])

  const removeNote = useCallback((id) => {
    if (!window.confirm('Excluir esta anotação?')) return
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  useEffect(() => {
    if (selectedId == null) {
      if (notes[0]) setSelectedId(notes[0].id)
      return
    }
    if (!notes.some((n) => n.id === selectedId)) {
      setSelectedId(notes[0]?.id ?? null)
    }
  }, [notes, selectedId])

  return (
    <div className="flex h-full min-h-[280px] flex-col bg-[#1e1e1e] text-[#d4d4d4] md:flex-row">
      <aside className="flex max-h-[40vh] shrink-0 flex-col border-b border-[#333] md:max-h-none md:w-[min(40%,260px)] md:border-b-0 md:border-r">
        <div className="border-b border-[#333] p-3">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-[#a8c8ff]">
            Anotações
          </h2>
          <p className="mt-1 font-mono text-[10px] text-[#666]">
            Guardadas neste dispositivo (localStorage).
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={addNote}
              className="flex-1 rounded border border-[#3584e4]/60 bg-[#3584e4]/20 px-2 py-1.5 font-mono text-[11px] font-medium text-[#a8c8ff] hover:bg-[#3584e4]/30"
            >
              + Nova
            </button>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            className="mt-2 w-full rounded border border-[#3a3a3a] bg-[#262626] px-2 py-1.5 font-mono text-[11px] text-[#e4e4e4] outline-none placeholder:text-[#555] focus:border-[#3584e4]"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="rounded border border-dashed border-[#3a3a3a] px-3 py-6 text-center font-mono text-[11px] text-[#666]">
              {notes.length === 0
                ? 'Nenhuma anotação. Toque em «Nova».'
                : 'Nada encontrado na busca.'}
            </li>
          ) : (
            filtered.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(n.id)}
                  className={`mb-1 w-full rounded border px-2 py-2 text-left font-mono text-[11px] transition-colors ${
                    n.id === selectedId
                      ? 'border-[#3584e4]/70 bg-[#3584e4]/15 text-[#ececec]'
                      : 'border-transparent bg-[#262626]/80 text-[#aaa] hover:border-[#444] hover:bg-[#2a2a2a]'
                  }`}
                >
                  <span className="line-clamp-2 block font-medium text-[#d8d8d8]">
                    {n.title.trim() || 'Sem título'}
                  </span>
                  <span className="mt-0.5 block text-[9px] text-[#666]">
                    {formatDate(n.updatedAt)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {selected ? (
          <>
            <div className="flex shrink-0 items-center gap-2 border-b border-[#333] p-3">
              <input
                type="text"
                value={selected.title}
                onChange={(e) => touch(selected.id, { title: e.target.value })}
                className="min-w-0 flex-1 rounded border border-[#3a3a3a] bg-[#262626] px-2 py-1.5 font-mono text-sm font-medium text-[#f0f0f0] outline-none focus:border-[#3584e4]"
                placeholder="Título"
                aria-label="Título da anotação"
              />
              <button
                type="button"
                onClick={() => removeNote(selected.id)}
                className="shrink-0 rounded border border-red-900/50 px-2 py-1.5 font-mono text-[10px] text-red-300/90 hover:bg-red-950/40"
              >
                Excluir
              </button>
            </div>
            <textarea
              value={selected.body}
              onChange={(e) => touch(selected.id, { body: e.target.value })}
              className="min-h-0 flex-1 resize-none bg-[#1a1a1a] p-3 font-mono text-[13px] leading-relaxed text-[#d8d8d8] outline-none placeholder:text-[#555]"
              placeholder="Escreva aqui…"
              aria-label="Conteúdo da anotação"
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="font-mono text-[12px] text-[#777]">
              Selecione uma anotação ou crie uma nova.
            </p>
            <button
              type="button"
              onClick={addNote}
              className="rounded border border-[#3584e4]/60 bg-[#3584e4]/20 px-4 py-2 font-mono text-[11px] text-[#a8c8ff] hover:bg-[#3584e4]/30"
            >
              + Nova anotação
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
