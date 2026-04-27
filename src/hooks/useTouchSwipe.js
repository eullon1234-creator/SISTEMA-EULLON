import { useCallback, useRef } from 'react'

/**
 * Swipe horizontal: chama onSwipe('left'|'right') ao passar do threshold.
 */
export function useTouchSwipe({ onSwipe, threshold = 56 }) {
  const startX = useRef(0)

  const onTouchStart = useCallback(
    (e) => {
      startX.current = e.touches[0]?.clientX ?? 0
    },
    [],
  )

  const onTouchEnd = useCallback(
    (e) => {
      const endX = e.changedTouches[0]?.clientX ?? startX.current
      const dx = endX - startX.current
      if (Math.abs(dx) < threshold) return
      if (dx < 0) onSwipe?.('left')
      else onSwipe?.('right')
    },
    [onSwipe, threshold],
  )

  return { onTouchStart, onTouchEnd }
}
