# Áudio recebido inaudível (TIA-19) — Design

**Status:** aprovado para implementação
**Issue:** [TIA-19](https://linear.app/tiago-santo/issue/TIA-19) — "Ao receber um áudio não está sendo possível ouvi-lo. A duração do áudio não é exibida no envio e nem no recebimento."

## Causa raiz

`ChatScreen.tsx:320-326` grava a mensagem de voz no melhor formato que o **aparelho de quem grava** suporta:

```js
const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
  : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
  : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4'
  : ...
```

Android grava em **webm/opus**. O arquivo é salvo assim no servidor (`server/src/routes/uploads.ts`) e entregue exatamente igual pra quem recebe. **O WebKit do iOS nunca decodificou o contêiner webm** — nem áudio, nem vídeo; é limitação histórica da Apple. Uma mãe no Android manda pra uma mãe no iPhone, e o `<audio>` dela não tem como tocar o arquivo.

O segundo sintoma ("duração não aparece") é a mesma causa: é um bug conhecido do Chromium — o contêiner webm produzido pelo `MediaRecorder` não grava a duração no cabeçalho, então `audio.duration` (usado em `ChatScreen.tsx:41-66`) retorna `Infinity` até o áudio começar a tocar.

**Os dois sintomas somem juntos** trocando o arquivo por um contêiner que sempre tem duração no cabeçalho e que os dois motores (WebKit e Chromium) sabem tocar.

## Solução

Transcodificar todo áudio de chat pra **AAC em contêiner M4A** no servidor, no momento do upload — independente do formato que chegou. `ffmpeg` já resolve isso com um binário só, sem biblioteca JS extra.

```
Cliente grava (webm/opus, mp4 ou ogg — o que o aparelho suportar)
        │
        ▼
POST /uploads  →  grava o arquivo original em disco
        │
        ▼
  é audio/*?  ──não──▶ responde normal (fotos não mudam)
        │
       sim
        ▼
  ffmpeg → AAC/M4A (contêiner com duração no cabeçalho, toca em iOS e Android)
        │
        ▼
  apaga o original, responde com a URL do .m4a
```

Se o `ffmpeg` falhar (arquivo corrompido, upload incompleto), a rota responde erro e apaga o que foi salvo — melhor a usuária tentar gravar de novo do que a conversa guardar um áudio quebrado.

## Por que no servidor, e não trocando o formato de gravação no cliente

Gravar sempre em `audio/mp4` no cliente **não** resolve:
- Nem todo WebView Android suporta gravar em mp4/AAC (`MediaRecorder.isTypeSupported` varia por versão/fabricante) — o fallback pra webm continuaria existindo.
- Não corrige as mensagens de voz que **já estão salvas** como webm no banco de produção.

Transcodificar no servidor corrige os dois casos de uma vez: funciona não importa o que o aparelho de quem grava suportar, e um script avulso (fora do fluxo normal da rota) pode rodar contra o histórico já salvo.

## Escopo

**Dentro:**
- `ffmpeg` instalado na imagem Docker do backend.
- Transcodificação no `POST /uploads` pra arquivos `audio/*`.
- Testes com o `ffmpeg` mockado (não dá pra rodar o binário de verdade no CI/nesta máquina).

**Fora (não faz parte desta entrega):**
- Script de backfill pro histórico de áudios já salvos como webm — fica de fora por agora; roda manualmente na VPS depois que a rota nova estiver validada em produção, não faz sentido migrar dado antes de confirmar que o pipeline novo está correto.
- Vídeo (TIA-28) — mesma família de problema, mas escopo maior, fica pra aquela issue.

## Verificação

Não dá pra testar o binário real localmente (sem `ffmpeg` instalado nesta máquina) nem no CI sem builda a imagem Docker. A verificação final é manual, depois do deploy: mandar uma mensagem de voz de um Android real pra um iPhone real (ou simulação equivalente) e confirmar que toca e mostra a duração.
