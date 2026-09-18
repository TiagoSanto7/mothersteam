import type { FastifyInstance } from 'fastify'
import { createWriteStream, mkdirSync, unlinkSync } from 'fs'
import { writeFile, rename } from 'fs/promises'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
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

// Teto de dimensão — nada na UI precisa de mais que isso; existe só pra
// segunda camada de proteção não deixar passar um bitmap gigante (câmeras
// Android modernas chegam a 8000x6000+). O cliente já entrega imagens bem
// menores (crop de perfil é ~280x280), então isso raramente dispara — é
// rede de segurança, não o redimensionamento principal.
const MAX_IMAGE_DIMENSION = 2048

/**
 * Confirma que o arquivo é uma imagem de verdade (o mimetype declarado no
 * multipart não prova nada — é só o que o cliente disse que é) e normaliza
 * orientação EXIF + teto de dimensão. GIF fica de fora do reprocessamento:
 * sharp só mantém o 1º frame sem a opção `animated`, e reencodar mataria
 * qualquer GIF animado — só valida que abre, não reprocessa.
 *
 * Lança se o arquivo não for uma imagem decodificável.
 */
async function validateAndNormalizeImage(filepath: string, baseMime: string): Promise<void> {
  const img = sharp(filepath, { failOn: 'error' })
  const meta = await img.metadata()
  if (!meta.width || !meta.height) throw new Error('Image has no readable dimensions')

  if (baseMime === 'image/gif') return

  img.rotate() // bake EXIF orientation into pixels
  if (meta.width > MAX_IMAGE_DIMENSION || meta.height > MAX_IMAGE_DIMENSION) {
    img.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
  }
  const buffer = await img.toBuffer()

  // Escreve em arquivo temporário + rename em vez de sobrescrever o path
  // original direto: sharp pode ainda segurar um handle de leitura aberto
  // nesse mesmo arquivo (mais visível no Windows, onde não dá pra abrir pra
  // escrita um arquivo já aberto pra leitura) — rename é atômico e não
  // conflita com isso em nenhum SO.
  const tmpPath = `${filepath}.tmp`
  await writeFile(tmpPath, buffer)
  await rename(tmpPath, filepath)
}

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

    if (baseMime.startsWith('image/')) {
      try {
        await validateAndNormalizeImage(filepath, baseMime)
      } catch (err) {
        fastify.log.error(`Image validation failed: ${err}`)
        unlinkSync(filepath)
        return reply.status(422).send({ error: 'Invalid image' })
      }
      return { url: `/uploads/${filename}` }
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
