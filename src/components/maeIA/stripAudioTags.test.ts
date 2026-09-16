import { describe, it, expect } from 'vitest';
import { stripAudioTags, stripAudioTagsPartial } from './stripAudioTags';

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

  it('returns an empty string when the message is only a tag', () => {
    expect(stripAudioTags('[Pausa]')).toBe('');
  });
});

describe('stripAudioTagsPartial', () => {
  it('behaves like stripAudioTags when there is no incomplete trailing tag', () => {
    expect(stripAudioTagsPartial('Oi [Com empatia] tudo bem?')).toBe('Oi tudo bem?');
  });

  it('cuts off an incomplete tag at the end of the streamed-so-far text', () => {
    expect(stripAudioTagsPartial('Oi, tudo bem? [Com carin')).toBe('Oi, tudo bem?');
  });

  it('leaves an unmatched "[" with no closing bracket earlier in the text alone if more text follows', () => {
    expect(stripAudioTagsPartial('Oi, tudo bem?')).toBe('Oi, tudo bem?');
  });

  it('returns empty string when the streamed-so-far text is only an incomplete tag', () => {
    expect(stripAudioTagsPartial('[Com carin')).toBe('');
  });
});
