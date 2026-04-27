import { useCallback, useEffect, useRef } from 'react'
import { InternalAiAssistant } from './internal/InternalAiAssistant'
import { InternalAiKeysApp } from './internal/InternalAiKeysApp'
import { InternalMyProjects } from './internal/InternalMyProjects'
import { InternalNotes } from './internal/InternalNotes'
import { LinuxWindowChrome } from './LinuxWindowChrome'

function InternalFilesPlaceholder() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 text-slate-300">
      <p className="text-sm leading-relaxed">
        Módulo de arquivos virtuais: aqui você integrará o{' '}
        <strong className="text-white">Firebase Storage</strong> por usuário
        (regras de segurança no console).
      </p>
      <ul className="list-inside list-disc text-sm text-slate-400">
        <li>Listagem e upload com o SDK web</li>
        <li>Pastas lógicas como prefixos no bucket</li>
      </ul>
    </div>
  )
}

function InternalSettings() {
  return (
    <div className="flex h-full flex-col gap-3 p-4 text-sm text-slate-300">
      <p>
        Defina as variáveis{' '}
        <code className="rounded bg-slate-800 px-1">VITE_FIREBASE_*</code> (veja{' '}
        <code className="rounded bg-slate-800 px-1">.env.example</code>) no arquivo{' '}
        <code className="rounded bg-slate-800 px-1">.env</code>, copiadas do console do
        Firebase.
      </p>
      <p className="text-slate-400">
        Apps externos: edite{' '}
        <code className="rounded bg-slate-800 px-1">public/apps.manifest.json</code>{' '}
        com <code className="rounded bg-slate-800 px-1">entryUrl</code> ou{' '}
        <code className="rounded bg-slate-800 px-1">repoUrl</code>.
      </p>
    </div>
  )
}

function renderInternalContent(internalId) {
  switch (internalId) {
    case 'files':
      return <InternalFilesPlaceholder />
    case 'settings':
      return <InternalSettings />
    case 'ai-keys':
      return <InternalAiKeysApp />
    case 'ai-assistant':
      return <InternalAiAssistant />
    case 'my-projects':
      return <InternalMyProjects />
    case 'notes':
      return <InternalNotes />
    default:
      return (
        <div className="p-4 text-sm text-slate-400">App interno desconhecido.</div>
      )
  }
}

function DraggableFrame({
  win,
  children,
  onClose,
  onPatchWindow,
  constrainedRef,
}) {
  const frameRef = useRef(null)
  const dragRef = useRef(null)
  const pos = useRef({ x: 8, y: 96 })
  const offset = useRef({ x: 0, y: 0 })
  const dragging = useRef(false)
  const wasMaximized = useRef(false)

  const maximized = Boolean(win.maximized)

  const clamp = useCallback(() => {
    if (maximized) return
    const parent = constrainedRef.current
    const el = frameRef.current
    if (!parent || !el) return
    const pr = parent.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    const maxX = Math.max(8, pr.width - er.width - 8)
    const maxY = Math.max(8, pr.height - er.height - 8)
    pos.current.x = Math.min(Math.max(8, pos.current.x), maxX)
    pos.current.y = Math.min(Math.max(8, pos.current.y), maxY)
    el.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`
  }, [constrainedRef, maximized])

  useEffect(() => {
    if (wasMaximized.current && !maximized) {
      pos.current = { x: 8, y: 96 }
    }
    wasMaximized.current = maximized
  }, [maximized])

  useEffect(() => {
    const el = frameRef.current
    if (!el || maximized) {
      if (el) el.style.transform = ''
      return undefined
    }
    el.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`
    clamp()
    const ro = new ResizeObserver(() => clamp())
    if (constrainedRef.current) ro.observe(constrainedRef.current)
    return () => ro.disconnect()
  }, [clamp, constrainedRef, maximized])

  const onPointerDown = (e) => {
    if (maximized) return
    const handle = dragRef.current
    if (!handle || !handle.contains(e.target)) return
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    const el = frameRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    offset.current = { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onPointerMove = (e) => {
    if (!dragging.current || maximized) return
    const parent = constrainedRef.current
    if (!parent) return
    const pr = parent.getBoundingClientRect()
    pos.current.x = e.clientX - pr.left - offset.current.x
    pos.current.y = e.clientY - pr.top - offset.current.y
    clamp()
  }

  const onPointerUp = (e) => {
    dragging.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  if (win.minimized) {
    return null
  }

  const frameClass = maximized
    ? 'absolute inset-x-1 top-1 z-30 flex flex-col overflow-hidden rounded-sm border border-[#1a1a1a] bg-[#2a2a2a] shadow-[0_4px_24px_rgba(0,0,0,0.55)] bottom-[calc(2.25rem+env(safe-area-inset-bottom)+2px)]'
    : 'absolute left-0 top-0 z-30 flex max-h-[85%] w-[min(92vw,440px)] flex-col overflow-hidden rounded-sm border border-[#1a1a1a] bg-[#2a2a2a] shadow-[0_4px_24px_rgba(0,0,0,0.55)] md:max-h-[78vh] md:w-[min(72vw,540px)]'

  return (
    <div ref={frameRef} className={frameClass}>
      <LinuxWindowChrome
        title={win.title}
        maximized={maximized}
        onMinimize={() =>
          onPatchWindow(win.id, { minimized: true, maximized: false })
        }
        onMaximize={() =>
          onPatchWindow(win.id, {
            minimized: false,
            maximized: !maximized,
          })
        }
        onClose={onClose}
        dragRef={dragRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <div className="min-h-0 flex-1 overflow-auto bg-[#1e1e1e]">{children}</div>
    </div>
  )
}

/**
 * @param {object} props
 * @param {Array<{ id: string, title: string, mode: 'fullscreen'|'floating', type: string, entryUrl?: string, internalId?: string, minimized?: boolean, maximized?: boolean }>} props.windows
 * @param {(id: string) => void} props.onClose
 * @param {(id: string, patch: object) => void} props.onPatchWindow
 */
export function AppWindows({ windows, onClose, onPatchWindow, layerRef }) {
  return (
    <>
      {windows.map((w) => {
        if (w.mode === 'fullscreen') {
          return (
            <div
              key={w.id}
              className="absolute inset-0 z-40 flex flex-col bg-[#1e1e1e]"
            >
              <div className="shrink-0 pt-[env(safe-area-inset-top)]">
                <LinuxWindowChrome
                  title={w.title}
                  showMinMax={false}
                  onClose={() => onClose(w.id)}
                  dragRef={undefined}
                  onPointerDown={undefined}
                  onPointerMove={undefined}
                  onPointerUp={undefined}
                  onPointerCancel={undefined}
                />
              </div>
              <div className="min-h-0 flex-1 border-t border-black/40">
                {w.type === 'iframe' && w.entryUrl ? (
                  <iframe
                    title={w.title}
                    src={w.entryUrl}
                    className="h-full w-full border-0 bg-white"
                    allow="fullscreen; clipboard-read; clipboard-write"
                  />
                ) : (
                  renderInternalContent(w.internalId)
                )}
              </div>
            </div>
          )
        }

        return (
          <DraggableFrame
            key={w.id}
            win={w}
            onClose={() => onClose(w.id)}
            onPatchWindow={onPatchWindow}
            constrainedRef={layerRef}
          >
            {w.type === 'iframe' && w.entryUrl ? (
              <iframe
                title={w.title}
                src={w.entryUrl}
                className="h-[min(60vh,480px)] w-full border-0 bg-white md:h-[min(50vh,520px)]"
                allow="fullscreen; clipboard-read; clipboard-write"
              />
            ) : (
              renderInternalContent(w.internalId)
            )}
          </DraggableFrame>
        )
      })}
    </>
  )
}
