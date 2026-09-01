import { ApiError } from './api'

export function parseApiError(err: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (err instanceof ApiError) {
    const msg: string = (err.body as { error?: string })?.error ?? ''

    switch (err.status) {
      case 400: return 'Dados inválidos. Verifique as informações.'
      case 401: return 'Sessão expirada. Faça login novamente.'
      case 403: return 'Você não tem permissão para esta ação.'
      case 404: return 'Item não encontrado.'
      case 409: return 'Conflito: esse item já existe.'
      case 422:
        if (msg.includes('estoque')) return msg
        if (msg.includes('No affiliate')) return 'Este produto não tem link disponível.'
        return msg || fallback
      case 429: return 'Muitas tentativas. Aguarde alguns segundos.'
      case 502:
      case 503: return 'Serviço temporariamente indisponível. Tente novamente.'
      default:
        if (err.status >= 500) return 'Erro no servidor. Tente novamente em instantes.'
        return msg || fallback
    }
  }

  if (err instanceof Error) {
    const m = err.message.toLowerCase()
    if (m.includes('network') || m.includes('failed to fetch') || m.includes('load failed'))
      return 'Sem conexão. Verifique sua internet.'
    if (m === 'cancelled' || m.includes('cancel')) return 'Operação cancelada.'
    return err.message || fallback
  }

  return fallback
}

