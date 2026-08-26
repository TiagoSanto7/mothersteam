import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MaeIAScreen } from './MaeIAScreen'

// ---------- mocks de módulo ----------

vi.mock('@elevenlabs/client', () => ({
  Conversation: { startSession: vi.fn() },
}))

vi.mock('../../store/useAppStore', () => {
  const state = { accessToken: 'tok-test', refreshToken: null }
  return {
    useAppStore: (selector: (s: typeof state) => unknown) => selector(state),
  }
})

// apiStream e apiFetch controláveis por teste
const mockApiStream = vi.fn<
  [
    string,
    unknown,
    (text: string) => void,
    () => void,
    (msg: string) => void,
  ],
  Promise<void>
>()

const mockApiFetch = vi.fn()

vi.mock('../../lib/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiStream: (...args: unknown[]) => mockApiStream(...args),
  resolveApiUrl: (p: string) => `https://api.test${p}`,
}))

// ---------- helpers ----------

function renderScreen() {
  return render(<MaeIAScreen />)
}

/** Simula um apiStream que entrega chunks e termina com onDone. */
function streamSuccess(chunks: string[]) {
  mockApiStream.mockImplementation(
    async (_path, _body, onChunk, onDone) => {
      for (const chunk of chunks) onChunk(chunk)
      onDone()
    },
  )
}

/** Simula um apiStream que entrega um frame de erro SSE. */
function streamError(msg: string) {
  mockApiStream.mockImplementation(
    async (_path, _body, _onChunk, _onDone, onError) => {
      onError(msg)
    },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------- testes ----------

describe('MaeIAScreen — render inicial', () => {
  it('exibe mensagem de boas-vindas da Sara', () => {
    renderScreen()
    expect(screen.getByText(/Sou a Sara/i)).toBeInTheDocument()
  })

  it('exibe chips de sugestão', () => {
    renderScreen()
    expect(screen.getByRole('button', { name: /cólica/i })).toBeInTheDocument()
  })
})

describe('MaeIAScreen — envio de mensagem de texto', () => {
  it('chama apiStream com o path correto e a mensagem no histórico', async () => {
    streamSuccess(['Olá!'])
    renderScreen()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'oi Sara' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(mockApiStream).toHaveBeenCalledTimes(1))

    const [path, body] = mockApiStream.mock.calls[0]
    expect(path).toBe('/mae-ia/chat')
    expect((body as { messages: unknown[] }).messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'oi Sara' }),
      ]),
    )
  })

  it('adiciona a mensagem do usuário ao chat antes de receber resposta', async () => {
    streamSuccess([])
    renderScreen()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'quanto pesa um recém-nascido?' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('quanto pesa um recém-nascido?')).toBeInTheDocument()
  })

  it('exibe três pontinhos animados enquanto o stream está vazio', async () => {
    // stream que nunca resolve durante o teste
    mockApiStream.mockImplementation(() => new Promise(() => {}))
    renderScreen()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'oi' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // Os pontinhos são 3 spans dentro da bolha de streaming
    await waitFor(() => {
      const dots = document.querySelectorAll('.w-1\\.5.h-1\\.5.rounded-full')
      expect(dots.length).toBeGreaterThanOrEqual(3)
    })
  })

  it('renderiza os chunks recebidos na bolha da Sara', async () => {
    streamSuccess(['Olá! ', 'Tudo bem.'])
    renderScreen()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'oi' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() =>
      expect(screen.getByText('Olá! Tudo bem.')).toBeInTheDocument(),
    )
  })

  it('limpa o input após enviar', async () => {
    streamSuccess(['ok'])
    renderScreen()

    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'teste' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(input.value).toBe(''))
  })

  it('não envia mensagem vazia', async () => {
    renderScreen()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mockApiStream).not.toHaveBeenCalled()
  })
})

describe('MaeIAScreen — quick chips', () => {
  it('clicar no chip envia a sugestão como mensagem', async () => {
    streamSuccess(['Dicas sobre cólica...'])
    renderScreen()

    const chip = screen.getByRole('button', { name: /cólica/i })
    fireEvent.click(chip)

    await waitFor(() => expect(mockApiStream).toHaveBeenCalledTimes(1))

    const [, body] = mockApiStream.mock.calls[0]
    expect((body as { messages: { content: string }[] }).messages.at(-1)?.content).toMatch(
      /cólica/i,
    )
  })
})

describe('MaeIAScreen — tratamento de erros', () => {
  it('exibe erro quando a resposta SSE contém frame de erro', async () => {
    streamError('Erro ao conectar com a Sara. Tente novamente.')
    renderScreen()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'oi' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() =>
      expect(
        screen.getByText(/erro ao conectar com a sara/i),
      ).toBeInTheDocument(),
    )
  })

  it('exibe erro de conexão quando fetch lança exceção (rede offline)', async () => {
    streamError('Sem conexão. Verifique sua internet e tente novamente.')
    renderScreen()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'oi' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() =>
      expect(screen.getByText(/sem conexão/i)).toBeInTheDocument(),
    )
  })

  it('exibe erro quando o backend retorna 404 (rota não encontrada)', async () => {
    // Simula o que apiStream faz quando res.ok === false (ex: 404)
    streamError('Erro ao conectar com a Sara. Tente novamente.')
    renderScreen()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'oi' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() =>
      expect(
        screen.getByText(/erro ao conectar com a sara/i),
      ).toBeInTheDocument(),
    )
  })

  it('libera o input após erro (permite reenviar)', async () => {
    streamError('Erro ao conectar com a Sara. Tente novamente.')
    renderScreen()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'oi' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => screen.getByText(/erro ao conectar com a sara/i))

    // Botão de enviar deve estar habilitado novamente
    fireEvent.change(input, { target: { value: 'tentativa 2' } })
    const sendBtn = screen.getByRole('button', { name: /enviar/i })
    expect(sendBtn).not.toBeDisabled()
  })

  it('não envia segunda mensagem enquanto stream está em curso', async () => {
    mockApiStream.mockImplementation(() => new Promise(() => {})) // nunca resolve
    renderScreen()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'oi' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // tenta enviar de novo imediatamente
    fireEvent.change(input, { target: { value: 'segunda mensagem' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockApiStream).toHaveBeenCalledTimes(1)
  })
})

describe('MaeIAScreen — histórico de sessão', () => {
  it('inclui mensagens anteriores no histórico enviado ao backend', async () => {
    streamSuccess(['Resposta 1'])
    renderScreen()

    // primeira mensagem
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'primeira pergunta' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => screen.getByText('Resposta 1'))

    // segunda mensagem
    streamSuccess(['Resposta 2'])
    fireEvent.change(input, { target: { value: 'segunda pergunta' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(mockApiStream).toHaveBeenCalledTimes(2))

    const [, body] = mockApiStream.mock.calls[1]
    const msgs = (body as { messages: { role: string; content: string }[] }).messages
    expect(msgs.some((m) => m.content === 'primeira pergunta')).toBe(true)
    expect(msgs.some((m) => m.content === 'segunda pergunta')).toBe(true)
  })

  it('não inclui a mensagem de boas-vindas (id 0) no histórico', async () => {
    streamSuccess(['ok'])
    renderScreen()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'oi' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(mockApiStream).toHaveBeenCalledTimes(1))

    const [, body] = mockApiStream.mock.calls[0]
    const msgs = (body as { messages: { content: string }[] }).messages
    expect(msgs.some((m) => /Sou a Sara/i.test(m.content))).toBe(false)
  })
})
