// A ElevenLabs (modelo eleven_v3_conversational, expressive_mode) embute tags de
// direção de voz tipo "[Com carinho]" no texto da resposta pra guiar a entonação do TTS.
// O widget oficial deles filtra isso antes de exibir; nossa UI própria precisa fazer o mesmo.
// O replace roda em loop até estabilizar pra lidar com colchetes aninhados sem deixar
// um "]" ou "[" solto visível (ex.: "[foo [bar] baz]" não pode virar "[foo baz]").
export function stripAudioTags(text: string): string {
  let result = text;
  let previous: string;
  do {
    previous = result;
    result = result.replace(/\[[^[\]]*\]\s*/g, '');
  } while (result !== previous);
  return result.replace(/[ \t]{2,}/g, ' ').trim();
}
