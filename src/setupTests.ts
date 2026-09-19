import '@testing-library/jest-dom'

// Node 26+ has a built-in experimental localStorage/sessionStorage on globalThis that
// shadows jsdom's and is unusable without --localstorage-file. In vitest `window` is
// globalThis, so read the storage from the jsdom instance vitest exposes and put it
// back on the globals — tests then don't need NODE_OPTIONS=--no-experimental-webstorage.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window
if (jsdomWindow) {
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, key, { configurable: true, value: jsdomWindow[key] })
  }
}

// jsdom does not implement scrollIntoView — provide a no-op stub
if (typeof window !== 'undefined' && !window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = function () {}
}

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
