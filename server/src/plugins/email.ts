import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { Resend } from 'resend'

declare module 'fastify' {
  interface FastifyInstance {
    sendEmail: (to: string, subject: string, html: string) => Promise<void>
  }
}

export const emailPlugin = fp(async (fastify: FastifyInstance) => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    fastify.log.warn('RESEND_API_KEY not set — email sending disabled')
    fastify.decorate('sendEmail', async () => {})
    return
  }

  const resend = new Resend(apiKey)
  const FROM = process.env.EMAIL_FROM ?? 'Mothers Team <noreply@santoti.com>'

  fastify.decorate('sendEmail', async (to: string, subject: string, html: string) => {
    try {
      await resend.emails.send({ from: FROM, to, subject, html })
    } catch (err) {
      fastify.log.warn({ err, to, subject }, 'sendEmail failed')
    }
  })
})
