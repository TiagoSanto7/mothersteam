import type { FastifyInstance } from 'fastify'
import { createWriteStream, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { randomUUID } from 'crypto'

const ALLOWED_MIMES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png',  '.png'],
  ['image/webp', '.webp'],
  ['image/gif',  '.gif'],
])

const UPLOADS_DIR = join(process.cwd(), 'uploads')

mkdirSync(UPLOADS_DIR, { recursive: true })

export async function uploadsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.post('/uploads', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const data = await request.file()
    if (!data) return reply.status(400).send({ error: 'No file uploaded' })

    const ext = ALLOWED_MIMES.get(data.mimetype)
    if (!ext) return reply.status(415).send({ error: 'Unsupported file type' })

    const filename = `${randomUUID()}${ext}`
    const filepath = join(UPLOADS_DIR, filename)

    await pipeline(data.file, createWriteStream(filepath))

    if (data.file.truncated) {
      unlinkSync(filepath)
      return reply.status(413).send({ error: 'File too large' })
    }

    return { url: `/uploads/${filename}` }
  })
}
