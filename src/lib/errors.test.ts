import { describe, it, expect } from 'vitest'
import { parseApiError } from './errors'
import { ApiError } from './api'

// ── parseApiError ─────────────────────────────────────────────

describe('parseApiError — códigos de status HTTP', () => {
  it('400 → mensagem de dados inválidos', () => {
    expect(parseApiError(new ApiError(400, {}))).toBe('Dados inválidos. Verifique as informações.')
  })

  it('401 → sessão expirada', () => {
    expect(parseApiError(new ApiError(401, {}))).toBe('Sessão expirada. Faça login novamente.')
  })

  it('403 → sem permissão', () => {
    expect(parseApiError(new ApiError(403, {}))).toBe('Você não tem permissão para esta ação.')
  })

  it('404 → item não encontrado', () => {
    expect(parseApiError(new ApiError(404, {}))).toBe('Item não encontrado.')
  })

  it('409 → conflito', () => {
    expect(parseApiError(new ApiError(409, {}))).toBe('Conflito: esse item já existe.')
  })

  it('429 → muitas tentativas', () => {
    expect(parseApiError(new ApiError(429, {}))).toBe('Muitas tentativas. Aguarde alguns segundos.')
  })

  it('502 → serviço indisponível', () => {
    expect(parseApiError(new ApiError(502, {}))).toBe('Serviço temporariamente indisponível. Tente novamente.')
  })

  it('503 → serviço indisponível', () => {
    expect(parseApiError(new ApiError(503, {}))).toBe('Serviço temporariamente indisponível. Tente novamente.')
  })

  it('500 → erro no servidor', () => {
    expect(parseApiError(new ApiError(500, {}))).toBe('Erro no servidor. Tente novamente em instantes.')
  })

  it('5xx arbitrário → erro no servidor', () => {
    expect(parseApiError(new ApiError(504, {}))).toBe('Erro no servidor. Tente novamente em instantes.')
  })

  it('4xx desconhecido com msg → retorna msg do body', () => {
    expect(parseApiError(new ApiError(418, { error: 'Sou um bule de chá.' }))).toBe('Sou um bule de chá.')
  })

  it('4xx desconhecido sem msg → retorna fallback padrão', () => {
    expect(parseApiError(new ApiError(418, {}))).toBe('Algo deu errado. Tente novamente.')
  })

  it('4xx desconhecido sem msg → respeita fallback customizado', () => {
    expect(parseApiError(new ApiError(418, {}), 'Erro custom.')).toBe('Erro custom.')
  })
})

describe('parseApiError — 422 (Unprocessable Entity)', () => {
  it('msg contém "estoque" → retorna a mensagem literal do servidor', () => {
    const msg = 'Produto sem estoque suficiente.'
    expect(parseApiError(new ApiError(422, { error: msg }))).toBe(msg)
  })

  it('msg contém "No affiliate" → produto sem link', () => {
    expect(parseApiError(new ApiError(422, { error: 'No affiliate link' }))).toBe('Este produto não tem link disponível.')
  })

  it('msg genérica não mapeada → retorna a msg do servidor', () => {
    expect(parseApiError(new ApiError(422, { error: 'Outro erro qualquer.' }))).toBe('Outro erro qualquer.')
  })

  it('msg vazia → usa fallback padrão', () => {
    expect(parseApiError(new ApiError(422, { error: '' }))).toBe('Algo deu errado. Tente novamente.')
  })

  it('msg vazia + fallback customizado → usa fallback customizado', () => {
    expect(parseApiError(new ApiError(422, {}), 'Erro de pagamento.')).toBe('Erro de pagamento.')
  })
})

describe('parseApiError — erros de rede (Error nativo)', () => {
  it('"network" na mensagem → sem conexão', () => {
    expect(parseApiError(new Error('network error'))).toBe('Sem conexão. Verifique sua internet.')
  })

  it('"failed to fetch" → sem conexão', () => {
    expect(parseApiError(new Error('Failed to fetch'))).toBe('Sem conexão. Verifique sua internet.')
  })

  it('"load failed" → sem conexão', () => {
    expect(parseApiError(new Error('Load failed'))).toBe('Sem conexão. Verifique sua internet.')
  })

  it('"cancelled" → operação cancelada', () => {
    expect(parseApiError(new Error('cancelled'))).toBe('Operação cancelada.')
  })

  it('"cancel" na mensagem → operação cancelada', () => {
    expect(parseApiError(new Error('User cancel action'))).toBe('Operação cancelada.')
  })

  it('mensagem desconhecida → retorna a mensagem do erro', () => {
    expect(parseApiError(new Error('Outro erro inesperado'))).toBe('Outro erro inesperado')
  })
})

describe('parseApiError — valores desconhecidos', () => {
  it('null → fallback padrão', () => {
    expect(parseApiError(null)).toBe('Algo deu errado. Tente novamente.')
  })

  it('string → fallback padrão', () => {
    expect(parseApiError('alguma string')).toBe('Algo deu errado. Tente novamente.')
  })

  it('objeto genérico → fallback padrão', () => {
    expect(parseApiError({ code: 'ERR_UNKNOWN' })).toBe('Algo deu errado. Tente novamente.')
  })
})

