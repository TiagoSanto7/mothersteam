import { describe, it, expect } from 'vitest'
import { apiChatToChat } from './helpers'
import type { ApiChat } from './types'

const ME = 'user-me'
const OTHER = 'user-other'

function makeChat(overrides: Partial<ApiChat> = {}): ApiChat {
  return {
    id: 'chat-1',
    participants: [
      { userId: ME,    chatId: 'chat-1', user: { id: ME,    name: 'Mariana', archetypeKey: null } },
      { userId: OTHER, chatId: 'chat-1', user: { id: OTHER, name: 'Ana',     archetypeKey: 'GUERREIRA' } },
    ],
    messages: [],
    createdAt: '2024-01-01T10:00:00Z',
    ...overrides,
  }
}

describe('apiChatToChat — lastMessage preview', () => {
  it('shows lastMessage content when the last message is unread', () => {
    const chat = makeChat({
      messages: [
        {
          id: 'msg-1',
          content: 'Olá, tudo bem?',
          chatId: 'chat-1',
          senderId: OTHER,
          sender: { id: OTHER, name: 'Ana', archetypeKey: null },
          read: false,
          createdAt: '2024-01-01T10:05:00Z',
        },
      ],
    })

    const result = apiChatToChat(chat, ME)

    expect(result.lastMessage).toBe('Olá, tudo bem?')
  })

  it('still shows lastMessage content after the message is marked as read', () => {
    const chat = makeChat({
      messages: [
        {
          id: 'msg-1',
          content: 'Olá, tudo bem?',
          chatId: 'chat-1',
          senderId: OTHER,
          sender: { id: OTHER, name: 'Ana', archetypeKey: null },
          read: true, // <-- message has been marked as read
          createdAt: '2024-01-01T10:05:00Z',
        },
      ],
    })

    const result = apiChatToChat(chat, ME)

    expect(result.lastMessage).toBe('Olá, tudo bem?')
  })

  it('shows empty string as lastMessage when there are no messages', () => {
    const chat = makeChat({ messages: [] })

    const result = apiChatToChat(chat, ME)

    expect(result.lastMessage).toBe('')
  })

  it('sets unread to 1 for an unread message from the other participant', () => {
    const chat = makeChat({
      messages: [
        {
          id: 'msg-1',
          content: 'Você viu a publicação?',
          chatId: 'chat-1',
          senderId: OTHER,
          sender: { id: OTHER, name: 'Ana', archetypeKey: null },
          read: false,
          createdAt: '2024-01-01T10:05:00Z',
        },
      ],
    })

    const result = apiChatToChat(chat, ME)

    expect(result.unread).toBe(1)
  })

  it('sets unread to 0 when the message is already read', () => {
    const chat = makeChat({
      messages: [
        {
          id: 'msg-1',
          content: 'Você viu a publicação?',
          chatId: 'chat-1',
          senderId: OTHER,
          sender: { id: OTHER, name: 'Ana', archetypeKey: null },
          read: true,
          createdAt: '2024-01-01T10:05:00Z',
        },
      ],
    })

    const result = apiChatToChat(chat, ME)

    expect(result.unread).toBe(0)
  })

  it('uses the other participant name in the "with" field', () => {
    const chat = makeChat()

    const result = apiChatToChat(chat, ME)

    expect(result.with).toBe('Ana')
  })
})
