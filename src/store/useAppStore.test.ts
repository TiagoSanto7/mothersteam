import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './useAppStore'

beforeEach(() => {
  useAppStore.setState({
    pendingShareContent: null,
  })
})

describe('pendingShareContent', () => {
  it('initializes as null', () => {
    expect(useAppStore.getState().pendingShareContent).toBeNull()
  })

  it('setPendingShareContent sets the content', () => {
    useAppStore.getState().setPendingShareContent('"Verso" — Referência')
    expect(useAppStore.getState().pendingShareContent).toBe('"Verso" — Referência')
  })

  it('setPendingShareContent(null) clears the content', () => {
    useAppStore.getState().setPendingShareContent('something')
    useAppStore.getState().setPendingShareContent(null)
    expect(useAppStore.getState().pendingShareContent).toBeNull()
  })
})
