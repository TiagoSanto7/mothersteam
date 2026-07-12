import { useEffect, useRef, useState } from 'react'

export function useIntersection(
  ref: React.RefObject<Element | null>,
  options?: IntersectionObserverInit,
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const savedOptions = useRef(options)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      savedOptions.current,
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return isIntersecting
}
