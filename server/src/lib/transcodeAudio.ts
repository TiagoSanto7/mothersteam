import { execFile } from 'child_process'

/**
 * Recodifica qualquer áudio de entrada pra AAC/M4A. Existe pra garantir que toda
 * mensagem de voz do chat toca em qualquer combinação de aparelhos — o formato
 * que cada WebView grava (webm/opus no Android, mp4 no iOS) não é garantidamente
 * decodificável pelo WebView de quem recebe (o WebKit do iOS nunca tocou webm).
 * Efeito colateral que resolve o outro sintoma da TIA-19 de graça: M4A sempre
 * grava a duração no cabeçalho, diferente do webm do MediaRecorder.
 */
export function transcodeAudioToM4a(inputPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'ffmpeg',
      ['-y', '-i', inputPath, '-vn', '-c:a', 'aac', '-b:a', '64k', outputPath],
      (err) => (err ? reject(err) : resolve(outputPath)),
    )
  })
}
