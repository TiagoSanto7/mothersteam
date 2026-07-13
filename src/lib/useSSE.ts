import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../store/useAppStore'

export function useSSE() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isLoggedIn) return

    // EventSource sends cookies automatically — the server authenticates via HttpOnly refresh cookie
    const es = new EventSource('/api/sse')

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as { type: string; chatId?: string }
        if (data.type === 'notification') {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        } else if (data.type === 'message' && data.chatId) {
          queryClient.invalidateQueries({ queryKey: ['messages', data.chatId] })
          queryClient.invalidateQueries({ queryKey: ['chats'] })
        }
      } catch { /* ignore malformed events */ }
    }

    return () => es.close()
  }, [isLoggedIn, queryClient])
}
