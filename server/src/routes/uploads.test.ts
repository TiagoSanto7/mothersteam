import { describe, expect, it, vi, afterEach } from 'vitest'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'
import { uploadsRoutes } from './uploads'

vi.mock('../lib/transcodeAudio', () => ({ transcodeAudioToM4a: vi.fn() }))
import { transcodeAudioToM4a } from '../lib/transcodeAudio'

const UPLOADS_DIR = join(process.cwd(), 'uploads')
const createdFiles: string[] = []

// PNG/JPEG 1x1 reais e mínimos — a validação com sharp (TIA-56) rejeita bytes
// que não decodificam de verdade, então "fake-image-bytes" não serve mais
// pros casos de sucesso (isso agora é exatamente o caso que deve dar 422).
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
)
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
  'base64'
)

afterEach(() => {
  vi.mocked(transcodeAudioToM4a).mockReset()
  for (const name of createdFiles.splice(0)) {
    const p = join(UPLOADS_DIR, name)
    if (existsSync(p)) unlinkSync(p)
  }
})

async function buildApp() {
  const app = Fastify()
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } })
  app.decorateRequest('userId', '')
  app.decorate('authenticate', async (request: any) => {
    request.userId = 'user-1'
  })
  await app.register(uploadsRoutes)
  return app
}

/** Monta um corpo multipart/form-data mínimo com um único arquivo. Aceita Buffer
 *  (bytes binários reais) ou string (pros testes de áudio, que não decodificam). */
function multipartBody(filename: string, contentType: string, content: string | Buffer) {
  const boundary = '----test-boundary'
  const head = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`
  )
  const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content)
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
  const body = Buffer.concat([head, contentBuffer, tail])
  return { body, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}

function trackUrl(url: string) {
  createdFiles.push(url.replace('/uploads/', ''))
}

describe('POST /uploads', () => {
  it('transcodifica upload de áudio pra m4a e devolve a URL nova', async () => {
    vi.mocked(transcodeAudioToM4a).mockImplementation((_in, out) => Promise.resolve(out))
    const app = await buildApp()
    const { body, headers } = multipartBody('voz.webm', 'audio/webm', 'fake-audio-bytes')

    const response = await app.inject({ method: 'POST', url: '/uploads', payload: body, headers })

    expect(response.statusCode).toBe(200)
    const { url } = response.json()
    expect(url).toMatch(/\.m4a$/)
    expect(transcodeAudioToM4a).toHaveBeenCalledTimes(1)
    trackUrl(url)
    await app.close()
  })

  it('responde 500 e não deixa arquivo quebrado quando o ffmpeg falha', async () => {
    vi.mocked(transcodeAudioToM4a).mockRejectedValue(new Error('Invalid data found when processing input'))
    const app = await buildApp()
    const { body, headers } = multipartBody('voz.webm', 'audio/webm', 'fake-audio-bytes')

    const response = await app.inject({ method: 'POST', url: '/uploads', payload: body, headers })

    expect(response.statusCode).toBe(500)
    await app.close()
  })

  it('aceita um JPEG válido, não transcodifica, e devolve a URL', async () => {
    const app = await buildApp()
    const { body, headers } = multipartBody('foto.jpg', 'image/jpeg', TINY_JPEG)

    const response = await app.inject({ method: 'POST', url: '/uploads', payload: body, headers })

    expect(response.statusCode).toBe(200)
    const { url } = response.json()
    expect(url).toMatch(/\.jpg$/)
    expect(transcodeAudioToM4a).not.toHaveBeenCalled()
    trackUrl(url)
    await app.close()
  })

  it('aceita um PNG válido', async () => {
    const app = await buildApp()
    const { body, headers } = multipartBody('foto.png', 'image/png', TINY_PNG)

    const response = await app.inject({ method: 'POST', url: '/uploads', payload: body, headers })

    expect(response.statusCode).toBe(200)
    const { url } = response.json()
    expect(url).toMatch(/\.png$/)
    trackUrl(url)
    await app.close()
  })

  it('rejeita bytes que não são uma imagem de verdade, mesmo com Content-Type de imagem (TIA-56)', async () => {
    const app = await buildApp()
    const { body, headers } = multipartBody('foto.jpg', 'image/jpeg', 'fake-image-bytes')

    const response = await app.inject({ method: 'POST', url: '/uploads', payload: body, headers })

    expect(response.statusCode).toBe(422)
    // não deve sobrar arquivo inválido em disco
    const filename = response.json().url?.replace('/uploads/', '')
    expect(filename).toBeUndefined()
    await app.close()
  })

  it('redimensiona uma imagem acima do teto de dimensão (TIA-56)', async () => {
    const largeJpeg = await sharp({
      create: { width: 3000, height: 2500, channels: 3, background: { r: 10, g: 20, b: 30 } },
    }).jpeg().toBuffer()

    const app = await buildApp()
    const { body, headers } = multipartBody('foto-grande.jpg', 'image/jpeg', largeJpeg)

    const response = await app.inject({ method: 'POST', url: '/uploads', payload: body, headers })

    expect(response.statusCode).toBe(200)
    const { url } = response.json()
    trackUrl(url)

    const savedPath = join(UPLOADS_DIR, url.replace('/uploads/', ''))
    const meta = await sharp(savedPath).metadata()
    expect(meta.width).toBeLessThanOrEqual(2048)
    expect(meta.height).toBeLessThanOrEqual(2048)
    await app.close()
  })

  it('normaliza orientação EXIF (rotaciona pros pixels, não deixa só a flag)', async () => {
    // gera um retângulo largo com EXIF Orientation=6 (90° horário) — depois de
    // normalizado, width/height devem estar trocados (imagem fica "em pé")
    const rotated = await sharp({
      create: { width: 200, height: 100, channels: 3, background: { r: 200, g: 50, b: 50 } },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer()

    const app = await buildApp()
    const { body, headers } = multipartBody('rotada.jpg', 'image/jpeg', rotated)

    const response = await app.inject({ method: 'POST', url: '/uploads', payload: body, headers })
    expect(response.statusCode).toBe(200)
    const { url } = response.json()
    trackUrl(url)

    const savedPath = join(UPLOADS_DIR, url.replace('/uploads/', ''))
    const meta = await sharp(savedPath).metadata()
    // orientação já foi aplicada nos pixels — não deve sobrar tag de rotação pendente
    expect(meta.orientation).toBeUndefined()
    expect(meta.width).toBe(100)
    expect(meta.height).toBe(200)
    await app.close()
  })
})
