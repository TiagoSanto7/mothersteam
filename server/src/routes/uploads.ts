import type { FastifyInstance } from 'fastify'
import { createWriteStream, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { randomUUID } from 'crypto'
import { transcodeAudioToM4a } from '../lib/transcodeAudio'

const ALLOWED_MIMES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png',  '.png'],
  ['image/webp', '.webp'],
  ['image/gif',  '.gif'],
  ['audio/webm', '.webm'],
  ['audio/ogg',  '.ogg'],
  ['audio/mp4',  '.m4a'],
  ['audio/mpeg', '.mp3'],
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

    const baseMime = data.mimetype.split(';')[0].trim()
    const ext = ALLOWED_MIMES.get(baseMime)
    if (!ext) return reply.status(415).send({ error: 'Unsupported file type' })

    const filename = `${randomUUID()}${ext}`
    const filepath = join(UPLOADS_DIR, filename)

    await pipeline(data.file, createWriteStream(filepath))

    if (data.file.truncated) {
      unlinkSync(filepath)
      return reply.status(413).send({ error: 'File too large' })
    }

    // Áudio de chat precisa tocar em qualquer combinação de aparelhos — ver
    // transcodeAudio.ts pra causa raiz (webm do Android não toca no WebKit do iOS).
    if (baseMime.startsWith('audio/')) {
      const m4aFilename = `${filename.slice(0, -ext.length)}.m4a`
      const m4aPath = join(UPLOADS_DIR, m4aFilename)
      try {
        await transcodeAudioToM4a(filepath, m4aPath)
      } catch (err) {
        fastify.log.error(`Audio transcode failed: ${err}`)
        unlinkSync(filepath)
        return reply.status(500).send({ error: 'Não foi possível processar o áudio' })
      }
      unlinkSync(filepath)
      return { url: `/uploads/${m4aFilename}` }
    }

    return { url: `/uploads/${filename}` }
  })
}
