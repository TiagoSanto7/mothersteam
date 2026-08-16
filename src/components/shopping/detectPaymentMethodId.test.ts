import { describe, it, expect } from 'vitest'
import { detectPaymentMethodId } from './CheckoutScreen'

describe('detectPaymentMethodId — identificação de bandeira por BIN', () => {
  describe('Visa', () => {
    it('começa com 4 → visa', () => {
      expect(detectPaymentMethodId('4111111111111111')).toBe('visa')
    })

    it('aceita número com espaços', () => {
      expect(detectPaymentMethodId('4111 1111 1111 1111')).toBe('visa')
    })
  })

  describe('Mastercard', () => {
    it('5480 → master (cartão de teste BR)', () => {
      expect(detectPaymentMethodId('5480832801033311')).toBe('master')
    })

    it('5031 → master', () => {
      expect(detectPaymentMethodId('5031433215406351')).toBe('master')
    })

    it('faixa 2221–2720 → master', () => {
      expect(detectPaymentMethodId('2221000000000000')).toBe('master')
      expect(detectPaymentMethodId('2720000000000000')).toBe('master')
    })
  })

  describe('Amex', () => {
    it('34 → amex', () => {
      expect(detectPaymentMethodId('378282246310005')).toBe('amex')
    })

    it('37 → amex', () => {
      expect(detectPaymentMethodId('371449635398431')).toBe('amex')
    })
  })

  describe('Elo (deve ter prioridade sobre Visa/Master)', () => {
    it('4011 → elo, não visa', () => {
      expect(detectPaymentMethodId('4011000000000000')).toBe('elo')
    })

    it('6277 → elo', () => {
      expect(detectPaymentMethodId('6277000000000000')).toBe('elo')
    })

    it('6516 → elo', () => {
      expect(detectPaymentMethodId('6516000000000000')).toBe('elo')
    })

    it('5066 → elo, não master', () => {
      expect(detectPaymentMethodId('5066000000000000')).toBe('elo')
    })

    it('5067 → elo, não master', () => {
      expect(detectPaymentMethodId('5067000000000000')).toBe('elo')
    })
  })

  describe('Hipercard', () => {
    it('606282 → hipercard', () => {
      expect(detectPaymentMethodId('6062820000000000')).toBe('hipercard')
    })

    it('637095 → hipercard', () => {
      expect(detectPaymentMethodId('6370950000000000')).toBe('hipercard')
    })
  })

  describe('Fallback', () => {
    it('BIN desconhecido → master', () => {
      expect(detectPaymentMethodId('9999000000000000')).toBe('master')
    })

    it('string vazia → master', () => {
      expect(detectPaymentMethodId('')).toBe('master')
    })
  })
})
