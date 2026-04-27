import { useEffect, useState } from 'react'
import { useDesktopAgent } from '../../hooks/useDesktopAgent'
import { loadMyProjectsManifest } from '../../lib/myProjectsManifest'

const FALLBACK = {
  version: 1,
  projects: [],
}

export function InternalMyProjects() {
  const { runTool } = useDesktopAgent()
  const [data, setData] = useState(FALLBACK)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadMyProjectsManifest()
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((e) => {
        setError(e.message)
        setData(FALLBACK)
      })
  }, [])

  function openProject(p) {
    const r = runTool('os_open_url_in_window', {
      url: p.url,
      title: p.name,
      fullscreen: true,
    })
    if (r && typeof r === 'object' && r.ok === false && r.error) {
      setError(String(r.error))
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 bg-[#1e1e1e] p-4 text-[#d4d4d4]">
      <div className="border-b border-[#333] pb-3">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-[#a8c8ff]">
          Meus projetos
        </h2>
        <p className="mt-1 font-mono text-[10px] leading-relaxed text-[#777]">
          Lista em <code className="rounded bg-[#2a2a2a] px-1 text-[#aaa]">public/my-projects.json</code>.
          O atalho <strong className="text-[#a8c8ff]">Balança Pro+</strong> está na área de trabalho.
          Use &quot;Abrir&quot; para outros projetos aqui cadastrados.
        </p>
      </div>

      {error ? (
        <p className="rounded border border-amber-900/50 bg-amber-950/30 px-2 py-1.5 font-mono text-[11px] text-amber-200/90">
          {error}
        </p>
      ) : null}

      {data.projects.length === 0 ? (
        <p className="rounded-sm border border-[#3a3a3a] bg-[#222] px-3 py-4 font-mono text-[11px] leading-relaxed text-[#888]">
          Nenhum projeto extra nesta lista. A{' '}
          <strong className="text-[#c8c8c8]">Balança Pro+</strong> abre pelo ícone{' '}
          <span className="text-[#a8c8ff]">⚖️ Balança Pro+</span> na área de trabalho. Para
          mais URLs, edite o JSON acima.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {data.projects.map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-2 rounded-sm border border-[#3a3a3a] bg-[#262626] p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-[#444] bg-[#1a1a1a] text-2xl">
                {p.iconEmoji || '📦'}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-[#ececec]">{p.name}</p>
                {p.description ? (
                  <p className="mt-0.5 font-mono text-[11px] leading-snug text-[#888]">
                    {p.description}
                  </p>
                ) : null}
                <p className="mt-1 truncate font-mono text-[10px] text-[#5a90d5]">{p.url}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
              <button
                type="button"
                onClick={() => openProject(p)}
                className="rounded border border-[#2a5a9a] bg-[#3584e4] px-4 py-2 font-mono text-xs font-medium text-white hover:bg-[#4a94f0]"
              >
                Abrir no WebOS
              </button>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-[#444] px-3 py-2 text-center font-mono text-xs text-[#aaa] hover:bg-[#333]"
              >
                Nova aba
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
