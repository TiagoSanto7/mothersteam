import { useState, useEffect, useRef, type RefObject } from 'react'

const THRESHOLD = 70

export function usePullToRefresh(
  containerRef: RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void>,
) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullY, setPullY] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const startY = useRef(0)
  const pullYRef = useRef(0)
  const isRefreshing = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop > 0) return
      startY.current = e.touches[0].clientY
    }

    function onTouchMove(e: TouchEvent) {
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0) {
        setIsPulling(true)
        const clamped = Math.min(delta, THRESHOLD * 1.5)
        pullYRef.current = clamped
        setPullY(clamped)
      }
    }

    async function onTouchEnd() {
      if (pullYRef.current >= THRESHOLD && !isRefreshing.current) {
        isRefreshing.current = true
        setIsLoading(true)
        await onRefresh()
        setIsLoading(false)
        isRefreshing.current = false
      }
      setIsPulling(false)
      setPullY(0)
      pullYRef.current = 0
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [containerRef, onRefresh])

  return { isPulling, pullY, isLoading }
}
