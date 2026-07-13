import { EventEmitter } from 'events'

export const sseEmitter = new EventEmitter()
sseEmitter.setMaxListeners(0)

export function emitNotification(userId: string) {
  sseEmitter.emit(`user:${userId}`, { type: 'notification' })
}

export function emitMessage(userId: string, chatId: string) {
  sseEmitter.emit(`user:${userId}`, { type: 'message', chatId })
}
