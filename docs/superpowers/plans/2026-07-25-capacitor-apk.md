# Capacitor APK — Build Android Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurar o Capacitor e gerar um APK de debug funcional do Mother's Team apontando para a API de produção (https://api.santoti.com), sem depender dos assets do designer.

**Architecture:** Capacitor wraps o React/Vite app em um WebView Android. O Vite build embute `VITE_API_URL` no bundle. O Gradle assembla o APK a partir do projeto Android gerado pelo `cap add android`. Não há compilação nova do código React — o `dist/` é copiado para o assets do Android.

**Tech Stack:** Capacitor 8.4, Vite 6, Android SDK (Gradle), Node 20

**Pré-requisito obrigatório:** Android Studio instalado com Android SDK. Como você tem Flutter, o SDK provavelmente já está em `%LOCALAPPDATA%\Android\sdk` ou `C:\Users\User\AppData\Local\Android\Sdk`. Confirme rodando `adb version` no terminal. Se não tiver, instale o Android Studio antes de prosseguir.

---

## File Map

**Criar:**
- `capacitor.config.ts` — configuração do Capacitor (na raiz do projeto)

**Modificar:**
- `.env.local` — adicionar `VITE_API_URL=https://api.santoti.com`

**Gerado pelos comandos (não editar manualmente):**
- `android/` — projeto Android Studio gerado pelo `npx cap add android`

---

## Task 1: Verificar pré-requisitos

- [ ] **Step 1: Confirmar Node e npm**

```bash
node --version   # deve ser >= 18
npm --version
```

- [ ] **Step 2: Confirmar Android SDK**

```bash
adb version
```

Se retornar `Android Debug Bridge version X.X.X` → OK.
Se retornar erro → instalar Android Studio de https://developer.android.com/studio e voltar aqui.

- [ ] **Step 3: Confirmar JAVA_HOME**

```powershell
$env:JAVA_HOME
java -version
```

Se `JAVA_HOME` estiver vazio mas `java -version` funcionar → OK (Gradle vai achar).
Se ambos falharem → instalar JDK 17+ (Android Studio instala automaticamente via SDK Manager → SDK Tools → Android SDK Build-Tools).

Dica: se tiver Flutter funcionando, o Java do Android Studio já está disponível em:
`C:\Program Files\Android\Android Studio\jbr`

- [ ] **Step 4: Confirmar que deps do Capacitor estão instaladas**

```bash
npx cap --version
```

Esperado: `Capacitor CLI version 8.X.X` (já está no devDependencies — rodado via npx funciona sem instalar globalmente).

---

## Task 2: Criar capacitor.config.ts

**Files:**
- Create: `capacitor.config.ts` (raiz do projeto, ao lado de package.json)

- [ ] **Step 1: Criar o arquivo de configuração**

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.santoti.mothersteam',
  appName: "Mother's Team",
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
```

`androidScheme: 'https'` faz o WebView usar `https://localhost` ao invés de `http://localhost`. Isso importa porque:
- A API de produção só aceita CORS de `https://localhost` e `capacitor://localhost`
- APIs do browser que exigem contexto seguro (ex: microfone pra Sara) funcionam em HTTPS

- [ ] **Step 2: Verificar que o arquivo está na raiz**

```bash
ls capacitor.config.ts
```

Esperado: arquivo existe.

- [ ] **Step 3: Commit**

```bash
git add capacitor.config.ts
git commit -m "feat(mobile): adicionar capacitor.config.ts com appId com.santoti.mothersteam"
```

---

## Task 3: Configurar VITE_API_URL para build de produção

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Adicionar variável no .env.local**

Abrir `.env.local` e adicionar a linha (se não existir):

```
VITE_API_URL=https://api.santoti.com
```

**Importante:** `.env.local` não é commitado (está no `.gitignore`). Isso é correto — a variável é injetada no bundle na hora do build.

- [ ] **Step 2: Verificar que VITE_API_URL não está no .gitignore de forma errada**

```bash
cat .gitignore | grep -i api_url
```

Se retornar algo, é problema — investigar. Normalmente `.env.local` inteiro está no gitignore, não variáveis individuais.

- [ ] **Step 3: Confirmar que o .env.local atual não quebra o dev local**

Se você usa o Vite proxy no dev (`/api` proxy para localhost:3001), `VITE_API_URL` não deve afetar o proxy — o proxy é configurado no `vite.config.ts` separadamente. Mas com `VITE_API_URL` set, o frontend vai chamar `https://api.santoti.com` diretamente, bypassando o proxy.

**Consequência:** enquanto o `.env.local` tiver `VITE_API_URL`, o dev local vai apontar pra API de produção. Se quiser dev local apontando para o backend local, comente a linha ou deixe o `.env.local` sem `VITE_API_URL`.

Para evitar confusão, você pode criar dois arquivos separados:
- `.env.local` — sem VITE_API_URL (dev normal)
- `.env.production.local` — com VITE_API_URL (build de produção/APK)

Vite carrega `.env.production.local` automaticamente quando `NODE_ENV=production`. O build `npm run build` usa `NODE_ENV=production` por padrão — então `.env.production.local` seria suficiente.

**Recomendação:** renomear para `.env.production.local`:

```bash
# renomear se quiser separar dev/prod:
# mv .env.local .env.production.local
# ou deixar em .env.local mesmo, que funciona pra builds de APK
```

Para este plano, vamos continuar com `.env.local` simples.

---

## Task 4: Fazer o build do Vite

- [ ] **Step 1: Rodar os testes antes de buildar**

```bash
npx vitest run 2>&1 | tail -5
```

Esperado: todos passam. Não buildar com testes quebrados.

- [ ] **Step 2: Build de produção**

```bash
npm run build
```

O comando executa `tsc && vite build`. O bundle gerado fica em `dist/`.

Esperado: sem erros. Warnings de bundle size são OK.

- [ ] **Step 3: Verificar que dist/ foi gerado corretamente**

```bash
ls dist/
```

Esperado: `index.html`, `assets/` com arquivos JS e CSS.

- [ ] **Step 4: (Opcional) Verificar que a URL da API está no bundle**

```bash
grep -r "api.santoti.com" dist/ --include="*.js" | head -3
```

Esperado: encontra a URL. Confirma que `VITE_API_URL` foi injetado corretamente.

---

## Task 5: Adicionar plataforma Android

- [ ] **Step 1: Inicializar projeto Capacitor**

```bash
npx cap init "Mother's Team" com.santoti.mothersteam --web-dir dist
```

Se perguntar se quer sobrescrever o `capacitor.config.ts` (já criamos na Task 2), responder `n` (não).

**Nota:** se o `capacitor.config.ts` já existir, este comando pode ser desnecessário — o Capacitor já o encontra. Teste com:

```bash
npx cap doctor
```

Esperado: sem erros críticos. Warnings sobre plataformas não instaladas são normais.

- [ ] **Step 2: Adicionar plataforma Android**

```bash
npx cap add android
```

Isso cria a pasta `android/` com um projeto Android Studio completo. Pode demorar alguns minutos.

Esperado: `android/` criada com `app/`, `gradle/`, `gradlew.bat`, etc.

- [ ] **Step 3: Copiar o build para o Android**

```bash
npx cap sync android
```

Isso copia `dist/` para `android/app/src/main/assets/public/` e atualiza plugins.

Esperado: `Sync finished in X.Xs`.

- [ ] **Step 4: Verificar que o build foi copiado**

```bash
ls android/app/src/main/assets/public/
```

Esperado: `index.html` e `assets/` presentes.

- [ ] **Step 5: Commit do projeto Android gerado**

```bash
# O .gitignore do Capacitor normalmente exclui android/build/ e android/.gradle/
# mas inclui android/app/src/ — verificar:
git status android/ | head -20
```

Se o Android Studio não estiver instalado ou o `.gitignore` excluir tudo, adicionar manualmente os arquivos necessários. O padrão do Capacitor é commitar a pasta `android/` excluindo as pastas de build.

```bash
git add android/
git add capacitor.config.ts
git commit -m "feat(mobile): adicionar plataforma Android com Capacitor 8"
```

---

## Task 6: Build do APK de debug

O APK pode ser gerado via linha de comando sem abrir o Android Studio.

- [ ] **Step 1: Garantir que ANDROID_HOME está configurado**

```powershell
$env:ANDROID_HOME
```

Se vazio, definir (ajustar o path conforme sua instalação):

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\sdk"
$env:PATH = "$env:PATH;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
```

Para persistir: adicionar ao perfil do PowerShell (`$PROFILE`) ou nas variáveis de ambiente do Windows.

- [ ] **Step 2: Build do APK via Gradle**

```powershell
cd android
.\gradlew.bat assembleDebug
```

Na primeira execução, o Gradle baixa dependências (~200MB). Pode demorar 5-10 minutos.

Esperado ao final:
```
BUILD SUCCESSFUL in Xm Xs
```

O APK estará em:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

- [ ] **Step 3: Verificar que o APK foi gerado**

```powershell
ls android\app\build\outputs\apk\debug\
```

Esperado: `app-debug.apk` de ~5-20MB.

- [ ] **Step 4: Instalar no dispositivo físico ou emulador**

**Opção A — Dispositivo físico:**
1. Habilite "Opções do desenvolvedor" no Android (toque 7x no número da build em Sobre o telefone)
2. Habilite "Depuração USB"
3. Conecte o cabo USB
4. Aceite a permissão de depuração no celular

```powershell
adb devices              # deve mostrar o dispositivo
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

**Opção B — Emulador Android Studio:**
```powershell
# Iniciar emulador via AVD Manager do Android Studio
# Depois instalar:
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

**Opção C — Transferir o APK manualmente:**
Copiar `app-debug.apk` para o celular via WhatsApp, Drive ou cabo, e instalar manualmente (habilitar "Instalar apps desconhecidos" nas configurações).

- [ ] **Step 5: Testar o APK**

Fluxo de validação mínimo:
1. App abre sem crash branco
2. Tela de login aparece
3. Login funciona (chama `https://api.santoti.com/auth/login`)
4. Navegar para Comunidade — posts carregam
5. Sara FAB no Hoje → MaeIA abre

Se a tela ficar branca após o login: abrir `chrome://inspect` no Chrome do computador (com dispositivo conectado via USB e USB debugging ativo) → inspecionar a WebView → ver erros no console.

---

## Task 7: (Opcional) adb reverse para dev local no APK

Quando quiser testar mudanças do frontend sem rebuildar o APK:

- [ ] **Step 1: Iniciar o dev server**

```bash
npm run dev
```

- [ ] **Step 2: Mapear portas do host para o emulador/dispositivo**

```bash
adb reverse tcp:5173 tcp:5173
adb reverse tcp:3001 tcp:3001
```

- [ ] **Step 3: Atualizar capacitor.config.ts para apontar pro dev server**

```typescript
const config: CapacitorConfig = {
  appId: 'com.santoti.mothersteam',
  appName: "Mother's Team",
  webDir: 'dist',
  server: {
    url: 'http://localhost:5173',   // ← dev server
    cleartext: true,
  },
};
```

- [ ] **Step 4: Sync e rebuild**

```bash
npx cap sync android
cd android && .\gradlew.bat assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

O `-r` reinstala sem desinstalar (preserva dados).

**Lembrar de reverter** o `capacitor.config.ts` para o modo produção antes de gerar o APK final.

---

## Self-Review

**Spec coverage checklist:**
- [x] capacitor.config.ts com appId correto — Task 2
- [x] VITE_API_URL apontando para api.santoti.com — Task 3
- [x] Build Vite gera dist/ correto — Task 4
- [x] Plataforma Android adicionada — Task 5
- [x] APK de debug gerado via Gradle CLI — Task 6
- [x] Instruções de instalação no dispositivo — Task 6, Step 4
- [x] Fluxo de validação do APK — Task 6, Step 5
- [x] Dev mode com adb reverse (bônus) — Task 7

**Notas importantes:**
- O APK gerado é **debug** (não asssinado para produção). Para publicar na Play Store, seria necessário `assembleRelease` com keystore assinada. Para testar no celular, debug é suficiente.
- A pasta `android/` deve ser commitada (excluindo as subpastas de build que o `.gitignore` já exclui automaticamente).
- Quando o designer entregar os assets (ícones + splash), usar `@capacitor/assets` para substituir os ícones padrão: `npx @capacitor/assets generate --android`.
