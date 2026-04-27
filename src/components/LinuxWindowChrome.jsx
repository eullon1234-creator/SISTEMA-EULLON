/**
 * Decoração de janela estilo barra de título Linux (botões à direita).
 */
export function LinuxWindowChrome({
  title,
  onClose,
  onMinimize = () => {},
  onMaximize = () => {},
  maximized = false,
  dragRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  showMinMax = true,
}) {
  const canDrag = Boolean(onPointerDown)
  return (
    <header
      ref={dragRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={`linux-titlebar flex h-9 shrink-0 items-center gap-1 border-b border-black/50 bg-gradient-to-b from-[#404040] to-[#333333] px-1.5 pl-2 text-[13px] text-[#ececec] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
        canDrag ? 'touch-none' : ''
      }`}
    >
      <span
        className={`min-w-0 flex-1 truncate font-medium ${
          canDrag ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-default'
        }`}
      >
        {title}
      </span>
      {showMinMax ? (
        <>
          <button
            type="button"
            title="Minimizar"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onMinimize}
            className="flex h-6 w-7 items-center justify-center rounded text-[11px] text-[#b0b0b0] hover:bg-white/10 hover:text-white"
          >
            _
          </button>
          <button
            type="button"
            title={maximized ? 'Restaurar' : 'Maximizar'}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onMaximize}
            className="flex h-6 w-7 items-center justify-center rounded text-[10px] text-[#b0b0b0] hover:bg-white/10 hover:text-white"
          >
            {maximized ? '❐' : '□'}
          </button>
        </>
      ) : null}
      <button
        type="button"
        title="Fechar"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onClose}
        className="flex h-6 w-8 items-center justify-center rounded text-sm font-bold leading-none text-[#cfcfcf] hover:bg-[#c34c4c] hover:text-white"
      >
        ×
      </button>
    </header>
  )
}
