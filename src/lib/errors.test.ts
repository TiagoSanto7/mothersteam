import { describe, it, expect } from 'vitest'
import { parseApiError, parsePaymentError } from './errors'
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

  it('msg contém "empty" → carrinho vazio', () => {
    expect(parseApiError(new ApiError(422, { error: 'Cart is empty' }))).toBe('Seu carrinho está vazio.')
  })

  it('msg contém "vazio" → carrinho vazio', () => {
    expect(parseApiError(new ApiError(422, { error: 'Carrinho vazio' }))).toBe('Seu carrinho está vazio.')
  })

  it('msg contém "cardToken" → dados do cartão inválidos', () => {
    expect(parseApiError(new ApiError(422, { error: 'cardToken is required' }))).toBe('Dados do cartão inválidos.')
  })

  it('msg contém "paymentMethod" → dados do cartão inválidos', () => {
    expect(parseApiError(new ApiError(422, { error: 'paymentMethod missing' }))).toBe('Dados do cartão inválidos.')
  })

  it('msg contém "Address" → endereço não encontrado', () => {
    expect(parseApiError(new ApiError(422, { error: 'Address not found' }))).toBe('Endereço não encontrado. Volte e selecione novamente.')
  })

  it('msg contém "pix" → erro ao gerar PIX', () => {
    expect(parseApiError(new ApiError(422, { error: 'pix generation failed' }))).toBe('Erro ao gerar PIX. Tente novamente.')
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

  it('"sdk not ready" → erro de inicialização do SDK', () => {
    expect(parseApiError(new Error('SDK not ready'))).toBe('Erro ao inicializar pagamento. Recarregue o app.')
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

// ── parsePaymentError ─────────────────────────────────────────

describe('parsePaymentError', () => {
  it('422 com msg vazia usa fallback de pagamento (não "Dados inválidos")', () => {
    expect(parsePaymentError(new ApiError(422, {}))).toBe('Erro ao processar pagamento. Tente novamente.')
  })

  it('erro de rede → sem conexão', () => {
    expect(parsePaymentError(new Error('network failure'))).toBe('Sem conexão. Verifique sua internet.')
  })

  it('objeto MP SDK com cause.message inválido → dados do cartão inválidos', () => {
    const mpError = { cause: { message: 'invalid card data' } }
    expect(parsePaymentError(mpError)).toBe('Dados do cartão inválidos.')
  })

  it('objeto MP SDK com cause.message não inválido → fallback de pagamento', () => {
    const mpError = { cause: { message: 'timeout' } }
    expect(parsePaymentError(mpError)).toBe('Erro ao processar pagamento. Tente novamente.')
  })

  it('ApiError 401 → delega ao parseApiError corretamente', () => {
    expect(parsePaymentError(new ApiError(401, {}))).toBe('Sessão expirada. Faça login novamente.')
  })

  it('valor desconhecido → fallback de pagamento', () => {
    expect(parsePaymentError(undefined)).toBe('Erro ao processar pagamento. Tente novamente.')
  })
})
