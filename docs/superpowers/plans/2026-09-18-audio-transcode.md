# Áudio recebido inaudível (TIA-19) — Plano de Implementação

> **Para workers agênticos:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` ou executar inline com TDD. Passos usam checkbox (`- [ ]`) para acompanhamento.

**Goal:** Toda mensagem de voz enviada no chat toca em qualquer aparelho (Android e iOS) e mostra a duração correta, não importa quem gravou.

**Architecture:** `POST /uploads` transcodifica qualquer upload `audio/*` pra AAC/M4A via `ffmpeg` antes de responder, usando um módulo pequeno e isolado (`transcodeAudio.ts`) que faz `execFile` do binário — sem lib JS de wrapper.

**Tech Stack:** Fastify, Node `child_process`, `ffmpeg` (instalado na imagem Docker).

**Spec:** `docs/superpowers/specs/2026-09-18-audio-transcode-design.md`

---

### Task 1: Módulo de transcodificação

**Files:**
- Create: `server/src/lib/transcodeAudio.ts`
- Test: `server/src/lib/transcodeAudio.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { execFile } from 'child_process'

vi.mock('child_process', () => ({ execFile: vi.fn() }))

const mockExecFile = vi.mocked(execFile)

describe('transcodeAudioToM4a', () => {
  beforeEach(() => { mockExecFile.mockReset() })

  it('chama o ffmpeg com os argumentos corretos e devolve o caminho de saída', async () => {
    mockExecFile.mockImplementation((_cmd, _args, cb) => {
      (cb as (err: null) => void)(null)
      return {} as never
    })

    const { transcodeAudioToM4a } = await import('./transcodeAudio')
    const out = await transcodeAudioToM4a('/tmp/in.webm', '/tmp/out.m4a')

    expect(out).toBe('/tmp/out.m4a')
    expect(mockExecFile).toHaveBeenCalledWith(
      'ffmpeg',
      ['-y', '-i', '/tmp/in.webm', '-vn', '-c:a', 'aac', '-b:a', '64k', '/tmp/out.m4a'],
      expect.any(Function),
    )
  })

  it('rejeita quando o ffmpeg falha (arquivo corrompido, etc.)', async () => {
    mockExecFile.mockImplementation((_cmd, _args, cb) => {
      (cb as (err: Error) => void)(new Error('Invalid data found when processing input'))
      return {} as never
    })

    const { transcodeAudioToM4a } = await import('./transcodeAudio')
    await expect(transcodeAudioToM4a('/tmp/in.webm', '/tmp/out.m4a')).rejects.toThrow(
      'Invalid data found when processing input',
    )
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Rodar (dentro de `server/`): `npx vitest run src/lib/transcodeAudio.test.ts`
Esperado: FAIL — `Failed to resolve import "./transcodeAudio"`

- [ ] **Step 3: Implementar**

```ts
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * Recodifica qualquer áudio de entrada pra AAC/M4A. Existe pra garantir que toda
 * mensagem de voz do chat toca em qualquer combinação de aparelhos — o formato
 * que cada WebView grava (webm/opus no Android, mp4 no iOS) não é garantidamente
 * decodificável pelo WebView de quem recebe (o WebKit do iOS nunca tocou webm).
 * Efeito colateral que resolve o outro sintoma da TIA-19 de graça: M4A sempre
 * grava a duração no cabeçalho, diferente do webm do MediaRecorder.
 */
export async function transcodeAudioToM4a(inputPath: string, outputPath: string): Promise<string> {
  await execFileAsync('ffmpeg', ['-y', '-i', inputPath, '-vn', '-c:a', 'aac', '-b:a', '64k', outputPath])
  return outputPath
}
```

- [ ] **Step 4: Rodar os testes**

Rodar: `npx vitest run src/lib/transcodeAudio.test.ts`
Esperado: PASS (2 testes)

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/transcodeAudio.ts server/src/lib/transcodeAudio.test.ts
git commit -m "feat(audio): add ffmpeg-backed transcode-to-M4A helper"
```

---

### Task 2: Ligar ao upload de áudio

**Files:**
- Modify: `server/src/routes/uploads.ts`
- Test: `server/src/routes/uploads.test.ts` (criar)

- [ ] **Step 1: Escrever os testes que falham**

Seguir o padrão de mock de `fastify.authenticate` já usado em `server/src/routes/baby.test.ts` (ler esse arquivo primeiro pra copiar o setup exato de app Fastify + auth mockada). Casos:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
// ...imports de setup seguindo o padrão de baby.test.ts...

vi.mock('../lib/transcodeAudio', () => ({ transcodeAudioToM4a: vi.fn() }))
import { transcodeAudioToM4a } from '../lib/transcodeAudio'

describe('POST /uploads', () => {
  it('transcodifica upload de áudio pra m4a e devolve a URL nova', async () => {
    vi.mocked(transcodeAudioToM4a).mockResolvedValue('/app/uploads/abc123.m4a')
    // upload multipart com um arquivo audio/webm
    // ...
    // expect(response.json().url).toMatch(/\.m4a$/)
    // expect(transcodeAudioToM4a).toHaveBeenCalled()
  })

  it('não transcodifica upload de imagem', async () => {
    // upload multipart com image/jpeg
    // expect(transcodeAudioToM4a).not.toHaveBeenCalled()
    // expect(response.json().url).toMatch(/\.jpg$/)
  })

  it('responde 500 e não deixa arquivo quebrado quando o ffmpeg falha', async () => {
    vi.mocked(transcodeAudioToM4a).mockRejectedValue(new Error('ffmpeg failed'))
    // upload multipart audio/webm
    // expect(response.statusCode).toBe(500)
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falham**

Rodar: `npx vitest run src/routes/uploads.test.ts`
Esperado: FAIL (arquivo de rota ainda não muda nada — ou 404 se o test file nem existir de fato até este ponto)

- [ ] **Step 3: Implementar**

```ts
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
```

- [ ] **Step 4: Rodar os testes**

Rodar: `npx vitest run src/routes/uploads.test.ts`
Esperado: PASS

- [ ] **Step 5: Rodar a suíte inteira do backend**

Rodar (dentro de `server/`): `npm test`
Esperado: PASS, sem regressão

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/uploads.ts server/src/routes/uploads.test.ts
git commit -m "fix(audio): transcode chat voice messages to M4A on upload (TIA-19)"
```

---

### Task 3: `ffmpeg` na imagem Docker

**Files:**
- Modify: `deploy/Dockerfile`

- [ ] **Step 1: Adicionar `ffmpeg` ao `apt-get install`**

```dockerfile
# antes
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# depois
# ffmpeg: transcodifica áudio de chat pra M4A (TIA-19) — webm gravado no Android
# não toca no WebKit do iOS, e não vem com duração no cabeçalho.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ffmpeg \
  && rm -rf /var/lib/apt/lists/*
```

- [ ] **Step 2: Commit**

```bash
git add deploy/Dockerfile
git commit -m "chore(deploy): install ffmpeg in the backend image (TIA-19)"
```

---

### Task 4: Verificação (manual, com o Tiago — não delegável)

- [ ] Abrir PR, mergear, aguardar o deploy automático (rebuilda a imagem Docker → `ffmpeg` entra)
- [ ] Confirmar no log do deploy que o build passou (a instalação do `ffmpeg` aumenta o tempo de build; não deve falhar)
- [ ] Gravar e mandar uma mensagem de voz de um Android real pra um iPhone real (ou vice-versa) — tem que tocar e mostrar a duração nos dois lados
- [ ] Conferir no volume de uploads da VPS que o arquivo novo saiu como `.m4a`
