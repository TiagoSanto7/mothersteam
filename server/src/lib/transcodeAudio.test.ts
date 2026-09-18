import { describe, it, expect, vi, beforeEach } from 'vitest'
import { execFile } from 'child_process'

vi.mock('child_process', () => {
  const execFile = vi.fn()
  return { execFile, default: { execFile } }
})

const mockExecFile = vi.mocked(execFile)

describe('transcodeAudioToM4a', () => {
  beforeEach(() => { mockExecFile.mockReset() })

  it('chama o ffmpeg com os argumentos corretos e devolve o caminho de saída', async () => {
    mockExecFile.mockImplementation((_cmd, _args, cb) => {
      ;(cb as (err: null) => void)(null)
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
      ;(cb as (err: Error) => void)(new Error('Invalid data found when processing input'))
      return {} as never
    })

    const { transcodeAudioToM4a } = await import('./transcodeAudio')
    await expect(transcodeAudioToM4a('/tmp/in.webm', '/tmp/out.m4a')).rejects.toThrow(
      'Invalid data found when processing input',
    )
  })
})
