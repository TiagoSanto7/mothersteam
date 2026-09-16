import { describe, it, expect } from 'vitest';
import { stripAudioTags } from './stripAudioTags';

describe('stripAudioTags', () => {
  it('removes a tag at the start of the text', () => {
    expect(stripAudioTags('[Com carinho]Oi, tudo bem?')).toBe('Oi, tudo bem?');
  });

  it('removes a tag in the middle without leaving double spaces', () => {
    expect(stripAudioTags('Oi [Com empatia] tudo bem?')).toBe('Oi tudo bem?');
  });

  it('removes multiple tags', () => {
    expect(stripAudioTags('[Com carinho] [Com confiança] Vamos lá!')).toBe('Vamos lá!');
  });

  it('leaves text without tags unchanged', () => {
    expect(stripAudioTags('Sem tags aqui.')).toBe('Sem tags aqui.');
  });

  it('trims leftover whitespace at the edges', () => {
    expect(stripAudioTags('[Com paciência]   Vai com calma.   ')).toBe('Vai com calma.');
  });

  it('removes nested brackets without leaving stray characters', () => {
    expect(stripAudioTags('[foo [bar] baz]texto')).toBe('texto');
  });

  it('removes a tag with no trailing whitespace before adjacent text', () => {
    expect(stripAudioTags('[tag]texto')).toBe('texto');
  });
});
