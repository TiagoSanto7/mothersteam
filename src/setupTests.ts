import '@testing-library/jest-dom'

// jsdom does not implement EventSource — provide a no-op stub
if (typeof EventSource === 'undefined') {
  class EventSourceStub {
    onmessage: ((e: MessageEvent) => void) | null = null
    onerror: ((e: Event) => void) | null = null
    close() {}
  }
  Object.defineProperty(globalThis, 'EventSource', {
    writable: true,
    configurable: true,
    value: EventSourceStub,
  })
}

// jsdom does not implement IntersectionObserver — provide a no-op stub
if (typeof IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserverStub,
  })
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserverStub,
  })
}
