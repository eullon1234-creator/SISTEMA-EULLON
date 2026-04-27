import { useEffect, useRef, useState } from 'react'
import { ROOT_FOLDER_ID } from '../lib/desktopLayoutStorage'

/**
 * Menu de contexto (clique direito / toque longo) para ícones do desktop.
 */
export function AppIconContextMenu({
  open,
  anchor,
  app,
  folders,
  onClose,
  onOpenDefault,
  onOpenFullscreen,
  onOpenFloating,
  onOpenNewTab,
  onCopyLink,
  onShare,
  onMoveToFolder,
  onNewFolderAndMove,
  onHideFromDesktop,
  onRename,
  onProperties,
}) {
  const menuRef = useRef(null)
  const [sub, setSub] = useState(null)

  useEffect(() => {
    if (!open) {
      setSub(null)
      return undefined
    }
    const close = (e) => {
      if (menuRef.current?.contains(e.target)) return
      onClose()
    }
    const esc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', close, true)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close, true)
      document.removeEventListener('keydown', esc)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open || !menuRef.current || !anchor) return
    const el = menuRef.current
    const pad = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    const r = el.getBoundingClientRect()
    let x = anchor.x
    let y = anchor.y
    if (x + r.width > vw - pad) x = vw - r.width - pad
    if (y + r.height > vh - pad) y = vh - r.height - pad
    if (x < pad) x = pad
    if (y < pad) y = pad
    el.style.left = `${x}px`
    el.style.top = `${y}px`
  }, [open, anchor])

  if (!open || !app || !anchor) return null

  const hasUrl = Boolean(app.entryUrl)

  const Btn = ({ children, onClick, disabled, danger }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-xs hover:bg-[#3584e4]/25 disabled:opacity-40 ${
        danger ? 'text-red-300 hover:bg-red-950/40' : 'text-[#e4e4e4]'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[60] min-w-[200px] max-w-[min(92vw,280px)] rounded border border-[#333] bg-[#2d2d2d] py-1 shadow-[0_8px_32px_rgba(0,0,0,0.65)]"
      style={{ left: 0, top: 0 }}
    >
      <div className="border-b border-[#404040] px-2 py-1.5">
        <p className="truncate font-mono text-[10px] font-semibold uppercase tracking-wide text-[#a8c8ff]">
          {app.name}
        </p>
        <p className="truncate font-mono text-[9px] text-[#666]">{app.id}</p>
      </div>

      <Btn onClick={() => { onOpenDefault(); onClose() }}>▶ Abrir</Btn>

      <div className="relative border-t border-[#404040]">
        <Btn onClick={() => setSub(sub === 'open' ? null : 'open')}>
          Abrir como… {sub === 'open' ? '▾' : '▸'}
        </Btn>
        {sub === 'open' ? (
          <div className="bg-[#252525] py-0.5">
            <Btn onClick={() => { onOpenFullscreen(); onClose() }}>⛶ Tela cheia</Btn>
            <Btn onClick={() => { onOpenFloating(); onClose() }}>▢ Janela</Btn>
            <Btn disabled={!hasUrl} onClick={() => { onOpenNewTab(); onClose() }}>
              ↗ Nova aba do navegador
            </Btn>
          </div>
        ) : null}
      </div>

      <Btn disabled={!hasUrl} onClick={() => { onCopyLink(); onClose() }}>
        📋 Copiar link
      </Btn>
      <Btn disabled={!hasUrl} onClick={() => { onShare(); onClose() }}>
        🔗 Partilhar…
      </Btn>

      <div className="relative border-t border-[#404040]">
        <Btn onClick={() => setSub(sub === 'move' ? null : 'move')}>
          📁 Mover para… {sub === 'move' ? '▾' : '▸'}
        </Btn>
        {sub === 'move' ? (
          <div className="max-h-40 overflow-y-auto bg-[#252525] py-0.5">
            {folders.map((f) => (
              <Btn
                key={f.id}
                onClick={() => {
                  onMoveToFolder(f.id)
                  onClose()
                }}
              >
                {f.id === ROOT_FOLDER_ID ? '🖥 ' : '📂 '}
                {f.name}
              </Btn>
            ))}
            <Btn
              onClick={() => {
                onNewFolderAndMove()
                onClose()
              }}
            >
              ➕ Nova pasta e mover
            </Btn>
          </div>
        ) : null}
      </div>

      <div className="border-t border-[#404040]">
        <Btn onClick={() => { onRename(); onClose() }}>✏️ Renomear atalho…</Btn>
        <Btn onClick={() => { onProperties(); onClose() }}>ℹ️ Propriedades</Btn>
      </div>

      <div className="border-t border-[#404040]">
        <Btn danger onClick={() => { onHideFromDesktop(); onClose() }}>
          🗑️ Ocultar do desktop
        </Btn>
      </div>
    </div>
  )
}
