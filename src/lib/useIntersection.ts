import { useCallback, useEffect, useRef, useState } from 'react'

/** Nearest ancestor that scrolls vertically, or null for the viewport. */
export function scrollParent(el: Element): Element | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if (overflowY === 'auto' || overflowY === 'scroll') return p
  }
  return null
}

/**
 * Tracks whether an element is on (or near) screen.
 *
 * Returns a callback ref instead of taking a ref object: the observer attaches whenever the
 * element actually mounts. With a ref object read once in an effect, a sentinel rendered after
 * a loading state was never observed, so infinite scroll silently stopped after page one.
 */
export function useIntersection<T extends Element = HTMLDivElement>(
  options?: IntersectionObserverInit,
): [(node: T | null) => void, boolean] {
  const [node, setNode] = useState<T | null>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const savedOptions = useRef(options)

  useEffect(() => {
    if (!node) {
      setIsIntersecting(false)
      return
    }
    // The app scrolls inside containers, not the window: use that container as the root so
    // rootMargin (prefetch distance) applies instead of being clipped away by the container.
    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { root: scrollParent(node), ...savedOptions.current },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])

  const ref = useCallback((el: T | null) => setNode(el), [])
  return [ref, isIntersecting]
}

/**
 * Infinite-scroll sentinel options: start loading the next page about two screens before the
 * end, like big feeds do, so the user does not reach a visible "end" while the next page loads.
 */
export const PREFETCH_MARGIN: IntersectionObserverInit = { rootMargin: '0px 0px 1600px 0px' }
