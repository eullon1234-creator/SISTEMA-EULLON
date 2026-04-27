import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useDesktopAgent } from '../hooks/useDesktopAgent'
import { useTouchSwipe } from '../hooks/useTouchSwipe'
import { loadAppsManifest } from '../lib/appsManifest'
import {
  loadDesktopLayout,
  ROOT_FOLDER_ID,
  saveDesktopLayout,
} from '../lib/desktopLayoutStorage'
import { loadMyProjectsManifest } from '../lib/myProjectsManifest'
import { AppIconContextMenu } from './AppIconContextMenu'
import { AppWindows } from './AppWindows'

const BUILTIN_APPS = [
  {
    id: 'sys-ai-assistant',
    name: 'Assistente IA',
    iconEmoji: '🤖',
    type: 'internal',
    internalId: 'ai-assistant',
    fullscreenDefault: true,
  },
  {
    id: 'sys-ai-keys',
    name: 'Chaves IA',
    iconEmoji: '🔑',
    type: 'internal',
    internalId: 'ai-keys',
    fullscreenDefault: false,
  },
  {
    id: 'sys-settings',
    name: 'Ajustes',
    iconEmoji: '⚙️',
    type: 'internal',
    internalId: 'settings',
    fullscreenDefault: false,
  },
  {
    id: 'sys-my-projects',
    name: 'Meus Projetos',
    iconEmoji: '🗂️',
    type: 'internal',
    internalId: 'my-projects',
    fullscreenDefault: false,
  },
  {
    id: 'balanca-pro-plus',
    name: 'Balança Pro+',
    iconEmoji: '⚖️',
    type: 'iframe',
    entryUrl: 'https://balanca-pro-plus.vercel.app/',
    fullscreenDefault: true,
  },
  {
    id: 'estoque-uhe-estrela',
    name: 'Estoque UHE Estrela',
    iconEmoji: '📦',
    type: 'iframe',
    entryUrl: 'https://eullon1234-creator.github.io/estoque-taboca-app/',
    fullscreenDefault: true,
  },
  {
    id: 'pizzaria-ramos',
    name: 'Pizzaria Ramos',
    iconEmoji: '🍕',
    type: 'iframe',
    entryUrl: 'https://pizzaria-ramos-lidi.vercel.app/',
    fullscreenDefault: true,
  },
  {
    id: 'dds-almoxarifado',
    name: 'DDS Almoxarifado',
    iconEmoji: '🛡️',
    type: 'iframe',
    entryUrl: 'https://dds-almoxarifado.vercel.app/',
    fullscreenDefault: true,
  },
  {
    id: 'historia-2026-games',
    name: 'Historia 2026 Games',
    iconEmoji: '🎮',
    type: 'iframe',
    entryUrl: 'https://historia-2026-games.vercel.app/',
    fullscreenDefault: true,
  },
  {
    id: 'gerador-kpi',
    name: 'KPI Master',
    iconEmoji: '📊',
    type: 'iframe',
    entryUrl: 'https://gerador-de-kpi.vercel.app/',
    fullscreenDefault: true,
  },
]

function formatClock(d) {
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AppIconButton({ app, label, onOpen, onRequestMenu }) {
  const emoji = app.iconEmoji || '📦'
  const iconUrl = app.iconUrl
  const longPressTimer = useRef(null)
  const longPressStart = useRef(null)
  const skipOpenRef = useRef(false)

  const clearLongPress = () => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    longPressStart.current = null
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (skipOpenRef.current) {
          skipOpenRef.current = false
          return
        }
        onOpen(app)
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        longPressStart.current = { x: e.clientX, y: e.clientY }
        longPressTimer.current = window.setTimeout(() => {
          longPressTimer.current = null
          skipOpenRef.current = true
          onRequestMenu?.(e.clientX, e.clientY)
        }, 550)
      }}
      onPointerMove={(e) => {
        if (!longPressStart.current || longPressTimer.current == null) return
        const dx = e.clientX - longPressStart.current.x
        const dy = e.clientY - longPressStart.current.y
        if (dx * dx + dy * dy > 120) clearLongPress()
      }}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onPointerLeave={clearLongPress}
      onContextMenu={(e) => {
        e.preventDefault()
        clearLongPress()
        onRequestMenu?.(e.clientX, e.clientY)
      }}
      className="group flex touch-manipulation flex-col items-center gap-1.5 rounded-md p-2 transition-colors hover:bg-white/5 active:bg-black/20"
    >
      <span className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded border border-[#4a4a4a] bg-gradient-to-b from-[#3d3d3d] to-[#2f2f2f] text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.4)] group-hover:border-[#5a90d5] group-hover:from-[#454545] group-hover:to-[#353535]">
        {iconUrl ? (
          <img src={iconUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          emoji
        )}
      </span>
      <span className="max-w-[5.5rem] truncate text-center font-mono text-[10px] font-medium leading-tight text-[#c8c8c8]">
        {label}
      </span>
    </button>
  )
}

/**
 * Shell principal do WebOS: status bar, páginas com swipe, grade de apps e camada de janelas.
 */
export function Desktop({ userEmail }) {
  const { setAgentApi } = useDesktopAgent()
  const layerRef = useRef(null)
  const workspaceLayerRef = useRef(null)
  const [clock, setClock] = useState(() => formatClock(new Date()))
  const [page, setPage] = useState(0)
  const [manifestApps, setManifestApps] = useState([])
  const [manifestError, setManifestError] = useState(null)
  const [myProjects, setMyProjects] = useState([])
  const [windows, setWindows] = useState([])
  const [desktopLayout, setDesktopLayout] = useState(() => loadDesktopLayout())
  const [appMenu, setAppMenu] = useState(null)
  const [showHiddenModal, setShowHiddenModal] = useState(false)

  const desktopLayoutRef = useRef(desktopLayout)
  useLayoutEffect(() => {
    desktopLayoutRef.current = desktopLayout
  }, [desktopLayout])

  const updateLayout = useCallback((patchOrFn) => {
    setDesktopLayout((prev) => {
      const next =
        typeof patchOrFn === 'function' ? patchOrFn(prev) : { ...prev, ...patchOrFn }
      saveDesktopLayout(next)
      return next
    })
  }, [])

  const pageRef = useRef(page)
  const maxPageRef = useRef(0)
  const windowsRef = useRef(windows)
  const manifestAppsRef = useRef(manifestApps)
  const openAppRef = useRef(null)
  const closeWindowRef = useRef(null)
  const setPageRef = useRef(setPage)
  const setWindowsRef = useRef(setWindows)
  const myProjectsRef = useRef([])

  useEffect(() => {
    const t = setInterval(() => setClock(formatClock(new Date())), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    loadAppsManifest()
      .then((data) => {
        setManifestApps(data.apps)
        setManifestError(null)
      })
      .catch((e) => {
        setManifestError(e.message)
        setManifestApps([])
      })
  }, [])

  useEffect(() => {
    loadMyProjectsManifest()
      .then((data) => setMyProjects(data.projects ?? []))
      .catch(() => setMyProjects([]))
  }, [])

  const mergedCatalog = useMemo(
    () => [...BUILTIN_APPS, ...manifestApps],
    [manifestApps],
  )

  const visibleApps = useMemo(() => {
    const hidden = new Set(desktopLayout.hiddenIds)
    const fid = desktopLayout.activeFolderId
    return mergedCatalog.filter((a) => {
      if (hidden.has(a.id)) return false
      const assigned = desktopLayout.folderByAppId[a.id]
      if (fid === ROOT_FOLDER_ID) {
        return !assigned || assigned === ROOT_FOLDER_ID
      }
      return assigned === fid
    })
  }, [mergedCatalog, desktopLayout])

  const pages = useMemo(() => {
    const perPage = 8
    const chunks = []
    for (let i = 0; i < visibleApps.length; i += perPage) {
      chunks.push(visibleApps.slice(i, i + perPage))
    }
    return chunks.length ? chunks : [[]]
  }, [visibleApps])

  const maxPage = pages.length - 1

  useEffect(() => {
    setPage((p) => Math.min(p, maxPage))
  }, [maxPage])

  const menuBaseApp = useMemo(() => {
    if (!appMenu?.app) return null
    return mergedCatalog.find((a) => a.id === appMenu.app.id) ?? appMenu.app
  }, [appMenu, mergedCatalog])

  const requestAppMenuAt = useCallback((app, cx, cy) => {
    const aliases = desktopLayoutRef.current.aliases
    setAppMenu({ x: cx, y: cy, app: { ...app, name: aliases[app.id] || app.name } })
  }, [])

  const swipe = useTouchSwipe({
    onSwipe: (dir) => {
      setPage((p) => {
        if (dir === 'left') return Math.min(maxPage, p + 1)
        return Math.max(0, p - 1)
      })
    },
  })

  const openApp = useCallback((app, opts = {}) => {
    const mode =
      opts.mode === 'floating'
        ? 'floating'
        : opts.mode === 'fullscreen'
          ? 'fullscreen'
          : app.fullscreenDefault
            ? 'fullscreen'
            : 'floating'
    const aliases = desktopLayoutRef.current.aliases
    const title = aliases[app.id] || app.name
    const id = `win-${app.id}-${Date.now()}`
    setWindows((prev) => [
      ...prev,
      {
        id,
        title,
        mode,
        type: app.type,
        entryUrl: app.entryUrl,
        internalId: app.internalId,
        minimized: false,
        maximized: false,
      },
    ])
  }, [])

  const closeWindow = useCallback((id) => {
    setWindows((prev) => prev.filter((w) => w.id !== id))
  }, [])

  const patchWindow = useCallback((id, patch) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    )
  }, [])

  useLayoutEffect(() => {
    pageRef.current = page
    windowsRef.current = windows
    manifestAppsRef.current = manifestApps
    setPageRef.current = setPage
    setWindowsRef.current = setWindows
    maxPageRef.current = maxPage
    openAppRef.current = openApp
    closeWindowRef.current = closeWindow
    myProjectsRef.current = myProjects
  }, [
    page,
    windows,
    manifestApps,
    myProjects,
    setPage,
    setWindows,
    maxPage,
    openApp,
    closeWindow,
  ])

  useEffect(() => {
    const allBuiltins = BUILTIN_APPS

    const getSnapshot = () => {
      const installed = [...allBuiltins, ...manifestAppsRef.current]
      return {
        desktop_page: pageRef.current,
        desktop_page_count: maxPageRef.current + 1,
        open_windows: windowsRef.current.map((w) => ({
          id: w.id,
          title: w.title,
          internal_id: w.internalId ?? null,
          mode: w.mode,
          minimized: Boolean(w.minimized),
          maximized: Boolean(w.maximized),
        })),
        installed_apps: installed.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          internal_id: a.internalId ?? null,
          entry_url: a.entryUrl ?? null,
        })),
        my_projects: (myProjectsRef.current ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          url: p.url,
          description: p.description ?? '',
        })),
      }
    }

    const runTool = (name, args) => {
      const open = openAppRef.current
      const closeWin = closeWindowRef.current

      switch (name) {
        case 'os_snapshot':
          return { ok: true, result: getSnapshot() }

        case 'os_open_internal': {
          const internalId = String(args.internal_id || '').trim()
          const hit =
            allBuiltins.find((b) => b.internalId === internalId) ||
            manifestAppsRef.current.find(
              (a) => a.type === 'internal' && a.internalId === internalId,
            )
          if (!hit) return { ok: false, error: `App interno não encontrado: ${internalId}` }
          open(hit)
          return { ok: true, result: { opened: hit.name, internal_id: internalId } }
        }

        case 'os_open_app_by_name': {
          const q = String(args.query || '')
            .trim()
            .toLowerCase()
          if (!q) return { ok: false, error: 'query vazia' }
          const installed = [...allBuiltins, ...manifestAppsRef.current]
          const hit = installed.find(
            (a) =>
              a.name.toLowerCase().includes(q) ||
              a.id.toLowerCase().includes(q) ||
              (a.internalId && a.internalId.toLowerCase().includes(q)),
          )
          if (!hit) return { ok: false, error: `Nenhum app combina com: ${q}` }
          open(hit)
          return { ok: true, result: { opened: hit.name, id: hit.id } }
        }

        case 'os_open_url_in_window': {
          const raw = String(args.url || '').trim()
          let u
          try {
            u = new URL(raw)
          } catch {
            return { ok: false, error: 'URL inválida' }
          }
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            return { ok: false, error: 'Somente http(s)' }
          }
          const title = String(args.title || 'Web').trim() || 'Web'
          const fullscreen = Boolean(args.fullscreen)
          open({
            id: `iframe-ai-${Date.now()}`,
            name: title,
            type: 'iframe',
            entryUrl: u.href,
            fullscreenDefault: fullscreen,
          })
          return { ok: true, result: { url: u.href, title } }
        }

        case 'os_list_my_projects': {
          const list = (myProjectsRef.current ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            url: p.url,
            description: p.description ?? '',
          }))
          return { ok: true, result: { projects: list, hint: 'Cadastro em public/my-projects.json' } }
        }

        case 'os_open_my_project': {
          const idArg = String(args.project_id || '').trim().toLowerCase()
          const qArg = String(args.query || '').trim().toLowerCase()
          if (!idArg && !qArg) {
            return { ok: false, error: 'Informe project_id ou query.' }
          }
          const list = myProjectsRef.current ?? []
          if (!list.length) {
            return {
              ok: false,
              error:
                'Lista de projetos vazia ou ainda a carregar. Confirme public/my-projects.json.',
            }
          }
          let hit = null
          if (idArg) {
            hit = list.find((p) => String(p.id || '').toLowerCase() === idArg)
          }
          if (!hit && qArg) {
            hit = list.find(
              (p) =>
                String(p.name || '')
                  .toLowerCase()
                  .includes(qArg) ||
                String(p.id || '')
                  .toLowerCase()
                  .includes(qArg),
            )
          }
          if (!hit) {
            return {
              ok: false,
              error:
                'Projeto não encontrado. Chame os_list_my_projects e use project_id ou query.',
            }
          }
          let u
          try {
            u = new URL(String(hit.url || '').trim())
          } catch {
            return { ok: false, error: 'URL do projeto inválida' }
          }
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            return { ok: false, error: 'Somente http(s)' }
          }
          const fs = args.fullscreen !== undefined ? Boolean(args.fullscreen) : true
          open({
            id: `iframe-proj-${hit.id}-${Date.now()}`,
            name: String(hit.name || 'Projeto'),
            type: 'iframe',
            entryUrl: u.href,
            fullscreenDefault: fs,
          })
          return {
            ok: true,
            result: { opened: hit.name, project_id: hit.id, url: u.href, fullscreen: fs },
          }
        }

        case 'os_close_window': {
          const wid = String(args.window_id || '').trim()
          if (!wid) return { ok: false, error: 'window_id obrigatório' }
          const list = windowsRef.current
          const w =
            list.find((x) => x.id === wid) ||
            list.find((x) => x.id.includes(wid) || x.id.endsWith(wid))
          if (!w) return { ok: false, error: `Janela não encontrada: ${wid}` }
          closeWin(w.id)
          return { ok: true, result: { closed: w.id } }
        }

        case 'os_close_all_windows':
          setWindowsRef.current([])
          return { ok: true, result: { closed_all: true } }

        case 'os_set_desktop_page': {
          const idx = Number(args.page_index)
          if (Number.isNaN(idx))
            return { ok: false, error: 'page_index inválido' }
          const clamped = Math.max(0, Math.min(idx, maxPageRef.current))
          setPageRef.current(clamped)
          return { ok: true, result: { page: clamped } }
        }

        case 'os_next_desktop_page': {
          const next = Math.min(pageRef.current + 1, maxPageRef.current)
          setPageRef.current(next)
          return { ok: true, result: { page: next } }
        }

        case 'os_prev_desktop_page': {
          const prev = Math.max(0, pageRef.current - 1)
          setPageRef.current(prev)
          return { ok: true, result: { page: prev } }
        }

        default:
          return { ok: false, error: `Ferramenta desconhecida: ${name}` }
      }
    }

    setAgentApi({ getSnapshot, runTool })
    return () => setAgentApi(null)
  }, [setAgentApi])

  return (
    <div
      ref={layerRef}
      className="relative flex min-h-dvh w-full flex-col bg-[#1a1a1a] text-[#e8e8e8]"
    >
      {/* Painel superior (estilo GNOME/XFCE) */}
      <header className="z-30 flex h-10 shrink-0 items-stretch border-b border-black bg-gradient-to-b from-[#3d3d3d] to-[#2e2e2e] pt-[env(safe-area-inset-top)] shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
          <span
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded border border-[#555] bg-[#2a2a2a] text-lg sm:flex"
            title="Menu"
            aria-hidden
          >
            ☰
          </span>
          <div className="flex min-w-0 flex-col leading-none">
            <span className="truncate font-mono text-[11px] font-semibold uppercase tracking-wide text-[#a8c8ff]">
              Eullon GNU
            </span>
            <span className="truncate font-mono text-[9px] text-[#888]">WebOS / área de trabalho</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center border-l border-black/40 bg-black/15 px-3">
          <span className="font-mono text-sm tabular-nums text-[#f0f0f0]">{clock}</span>
        </div>
        <div className="flex max-w-[45%] shrink-0 items-center gap-2 border-l border-black/40 px-2">
          {userEmail ? (
            <span
              className="hidden truncate font-mono text-[10px] text-[#9a9a9a] sm:inline"
              title={userEmail}
            >
              {userEmail}
            </span>
          ) : (
            <span className="font-mono text-[10px] text-[#777]">local</span>
          )}
          <span className="text-xs text-[#6a9edc]" title="Rede" aria-hidden>
            ⧉
          </span>
        </div>
      </header>

      {/* Área desktop + gestos (referência para maximizar janelas) */}
      <div
        ref={workspaceLayerRef}
        className="relative min-h-0 flex-1 touch-pan-y"
        {...swipe}
      >
        {manifestError ? (
          <p className="px-3 py-1.5 text-center font-mono text-[11px] text-amber-300/95">
            {manifestError}
          </p>
        ) : null}

        <div
          className={`linux-workspace-bg flex h-full min-h-0 flex-col px-3 pt-2 sm:px-5 ${
            windows.length > 0 ? 'pb-11' : 'pb-1'
          }`}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#333] pb-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 font-mono text-[10px] text-[#888]">
                <span className="shrink-0">Pasta</span>
                <select
                  value={desktopLayout.activeFolderId}
                  onChange={(e) => updateLayout({ activeFolderId: e.target.value })}
                  className="max-w-[11rem] rounded border border-[#444] bg-[#2a2a2a] px-1.5 py-0.5 font-mono text-[10px] text-[#ddd] outline-none focus:border-[#3584e4]"
                >
                  {desktopLayout.folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#888]">
                · pág. {page + 1}/{pages.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {desktopLayout.hiddenIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowHiddenModal(true)}
                  className="rounded border border-[#555] bg-[#2a2a2a] px-2 py-0.5 font-mono text-[10px] text-amber-200/90 hover:bg-[#333]"
                >
                  Ocultos ({desktopLayout.hiddenIds.length})
                </button>
              ) : null}
              <div className="flex gap-1">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Página ${i + 1}`}
                    onClick={() => setPage(i)}
                    className={`h-2 w-2 border border-[#444] transition-colors ${
                      i === page ? 'bg-[#3584e4]' : 'bg-[#2a2a2a] hover:bg-[#3a3a3a]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-4 content-start gap-x-1 gap-y-4 sm:grid-cols-5 md:grid-cols-6">
            {pages[page]?.length ? (
              pages[page].map((app) => (
                <AppIconButton
                  key={app.id}
                  app={app}
                  label={desktopLayout.aliases[app.id] || app.name}
                  onOpen={openApp}
                  onRequestMenu={(x, y) => requestAppMenuAt(app, x, y)}
                />
              ))
            ) : (
              <p className="col-span-full py-6 text-center font-mono text-[11px] text-[#666]">
                Nenhum app nesta pasta. Use o menu do ícone → «Mover para…» ou mude de pasta.
              </p>
            )}
          </div>

          <p className="mt-auto border-t border-[#333] pt-2 text-center font-mono text-[10px] text-[#666]">
            ← deslize para outras páginas · toque longo ou clique direito no ícone para opções
          </p>
        </div>

        {/* Barra de tarefas inferior */}
        {windows.length > 0 ? (
          <footer className="absolute bottom-0 left-0 right-0 z-[24] flex h-9 max-h-[calc(2.25rem+env(safe-area-inset-bottom))] items-stretch border-t border-black bg-gradient-to-b from-[#2c2c2c] to-[#222] pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.35)]">
            <div className="flex min-w-0 flex-1 items-center overflow-x-auto px-1">
              {windows.map((w) => (
                <div
                  key={w.id}
                  className="flex max-w-[10rem] shrink-0 items-stretch border-r border-black/50"
                >
                  <button
                    type="button"
                    title={
                      w.minimized ? 'Restaurar janela' : 'Focar janela (minimizada: clique para restaurar)'
                    }
                    onClick={() => {
                      if (w.minimized) patchWindow(w.id, { minimized: false })
                    }}
                    className={`flex min-w-0 flex-1 items-center px-2 py-1 text-left font-mono text-[10px] hover:bg-white/5 ${
                      w.minimized ? 'italic text-[#6a9edc]' : 'text-[#bbb]'
                    }`}
                  >
                    <span className="truncate">{w.title}</span>
                  </button>
                  <button
                    type="button"
                    title="Fechar janela"
                    onClick={() => closeWindow(w.id)}
                    className="shrink-0 px-2 font-mono text-[12px] text-[#888] hover:bg-[#c34c4c]/40 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </footer>
        ) : null}

        <AppWindows
          windows={windows}
          onClose={closeWindow}
          onPatchWindow={patchWindow}
          layerRef={workspaceLayerRef}
        />

        {showHiddenModal ? (
          <div
            role="presentation"
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setShowHiddenModal(false)
            }}
          >
            <div
              className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded border border-[#444] bg-[#2d2d2d] p-4 shadow-xl"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <h2 className="mb-3 font-mono text-xs font-semibold uppercase text-[#a8c8ff]">
                Apps ocultos
              </h2>
              <ul className="space-y-2">
                {desktopLayout.hiddenIds.map((hid) => {
                  const def = mergedCatalog.find((a) => a.id === hid)
                  return (
                    <li
                      key={hid}
                      className="flex items-center justify-between gap-2 font-mono text-[10px]"
                    >
                      <span className="min-w-0 truncate text-[#ccc]" title={hid}>
                        {def?.name ?? hid}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 rounded border border-[#555] px-2 py-0.5 hover:bg-white/5"
                        onClick={() =>
                          updateLayout((prev) => ({
                            ...prev,
                            hiddenIds: prev.hiddenIds.filter((x) => x !== hid),
                          }))
                        }
                      >
                        Restaurar
                      </button>
                    </li>
                  )
                })}
              </ul>
              <button
                type="button"
                className="mt-4 w-full rounded border border-[#555] py-1.5 font-mono text-[10px] hover:bg-white/5"
                onClick={() => setShowHiddenModal(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        ) : null}

        {appMenu && menuBaseApp ? (
          <AppIconContextMenu
            open
            anchor={{ x: appMenu.x, y: appMenu.y }}
            app={appMenu.app}
            folders={desktopLayout.folders}
            onClose={() => setAppMenu(null)}
            onOpenDefault={() => openApp(menuBaseApp)}
            onOpenFullscreen={() => openApp(menuBaseApp, { mode: 'fullscreen' })}
            onOpenFloating={() => openApp(menuBaseApp, { mode: 'floating' })}
            onOpenNewTab={() => {
              const u = menuBaseApp.entryUrl
              if (u) window.open(u, '_blank', 'noopener,noreferrer')
            }}
            onCopyLink={async () => {
              const u = menuBaseApp.entryUrl
              if (!u) return
              try {
                await navigator.clipboard.writeText(u)
              } catch {
                window.prompt('Copie o link:', u)
              }
            }}
            onShare={async () => {
              const u = menuBaseApp.entryUrl
              if (!u) return
              try {
                if (navigator.share) {
                  await navigator.share({
                    title: menuBaseApp.name,
                    text: menuBaseApp.name,
                    url: u,
                  })
                } else {
                  await navigator.clipboard.writeText(u)
                }
              } catch (e) {
                if (e?.name !== 'AbortError')
                  try {
                    await navigator.clipboard.writeText(u)
                  } catch {
                    window.prompt('Copie o link:', u)
                  }
              }
            }}
            onMoveToFolder={(folderId) => {
              const id = menuBaseApp.id
              updateLayout((prev) => ({
                ...prev,
                folderByAppId: { ...prev.folderByAppId, [id]: folderId },
              }))
            }}
            onNewFolderAndMove={() => {
              const raw = window.prompt('Nome da nova pasta')
              if (raw == null) return
              const name = String(raw).trim()
              if (!name) return
              const folderId = `f-${Date.now()}`
              const id = menuBaseApp.id
              updateLayout((prev) => ({
                ...prev,
                folders: [...prev.folders, { id: folderId, name }],
                folderByAppId: { ...prev.folderByAppId, [id]: folderId },
              }))
            }}
            onHideFromDesktop={() => {
              const id = menuBaseApp.id
              updateLayout((prev) =>
                prev.hiddenIds.includes(id)
                  ? prev
                  : { ...prev, hiddenIds: [...prev.hiddenIds, id] },
              )
            }}
            onRename={() => {
              const id = menuBaseApp.id
              const cur =
                desktopLayoutRef.current.aliases[id] || menuBaseApp.name
              const raw = window.prompt('Novo nome do atalho (vazio = nome original)', cur)
              if (raw === null) return
              const v = String(raw).trim()
              updateLayout((prev) => {
                const aliases = { ...prev.aliases }
                if (!v) delete aliases[id]
                else aliases[id] = v
                return { ...prev, aliases }
              })
            }}
            onProperties={() => {
              window.alert(
                JSON.stringify(
                  {
                    id: menuBaseApp.id,
                    type: menuBaseApp.type,
                    name: menuBaseApp.name,
                    entryUrl: menuBaseApp.entryUrl ?? null,
                    internalId: menuBaseApp.internalId ?? null,
                    fullscreenDefault: menuBaseApp.fullscreenDefault,
                  },
                  null,
                  2,
                ),
              )
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
