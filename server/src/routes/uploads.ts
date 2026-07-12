import type { FastifyInstance } from 'fastify'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { join, extname } from 'path'
import { pipeline } from 'stream/promises'
import { randomUUID } from 'crypto'

const UPLOADS_DIR = join(process.cwd(), 'uploads')

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true })
}

export async function uploadsRoutes(fastify: FastifyInstance) {
  fastify.post('/uploads', async (request, reply) => {
    const data = await request.file()
    if (!data) return reply.status(400).send({ error: 'No file uploaded' })

    const ext = extname(data.filename) || '.jpg'
    const filename = `${randomUUID()}${ext}`
    const filepath = join(UPLOADS_DIR, filename)

    await pipeline(data.file, createWriteStream(filepath))

    const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`
    return { url: `${baseUrl}/uploads/${filename}` }
  })
}
