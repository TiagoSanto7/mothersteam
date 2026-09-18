import { describe, expect, it, vi, afterEach } from 'vitest'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { uploadsRoutes } from './uploads'

vi.mock('../lib/transcodeAudio', () => ({ transcodeAudioToM4a: vi.fn() }))
import { transcodeAudioToM4a } from '../lib/transcodeAudio'

const UPLOADS_DIR = join(process.cwd(), 'uploads')
const createdFiles: string[] = []

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

/** Monta um corpo multipart/form-data mínimo com um único arquivo. */
function multipartBody(filename: string, contentType: string, content: string) {
  const boundary = '----test-boundary'
  const body =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--\r\n`
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

  it('não transcodifica upload de imagem', async () => {
    const app = await buildApp()
    const { body, headers } = multipartBody('foto.jpg', 'image/jpeg', 'fake-image-bytes')

    const response = await app.inject({ method: 'POST', url: '/uploads', payload: body, headers })

    expect(response.statusCode).toBe(200)
    const { url } = response.json()
    expect(url).toMatch(/\.jpg$/)
    expect(transcodeAudioToM4a).not.toHaveBeenCalled()
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
})
