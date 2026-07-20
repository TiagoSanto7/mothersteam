import { describe, it, expect } from 'vitest'
import { versiculoParaHumor } from './versiculos-presente'

describe('versiculoParaHumor', () => {
  it('A (confiante) → Salmos 139:14', () => {
    const v = versiculoParaHumor('A')
    expect(v.referencia).toBe('Salmos 139:14')
    expect(v.verso).toContain('formado')
  })

  it('B (cansada) → Mateus 11:28', () => {
    expect(versiculoParaHumor('B').referencia).toBe('Mateus 11:28')
  })

  it('C (ansiosa) → Filipenses 4:6-7', () => {
    expect(versiculoParaHumor('C').referencia).toBe('Filipenses 4:6-7')
  })

  it('D (sobrecarregada) → Isaías 40:31', () => {
    expect(versiculoParaHumor('D').referencia).toBe('Isaías 40:31')
  })

  it('undefined → fallback Salmos 139:14', () => {
    expect(versiculoParaHumor(undefined).referencia).toBe('Salmos 139:14')
  })
})
