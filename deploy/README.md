# Deploy — Mother's Team API na VPS

Guia passo-a-passo pra subir o backend em `api.santoti.com` usando Docker Compose + nginx no host.

## Pré-requisitos na VPS

- Debian 13 (já rodando)
- Docker + Docker Compose plugin
- nginx (já instalado)
- SSH acesso como root ou sudo
- DNS `api.santoti.com` → IP da VPS via Cloudflare (proxied)

Se Docker Compose plugin não estiver instalado:

```bash
apt update
apt install -y docker-compose-plugin
docker compose version   # confirmar
```

## Fase 1 — Copiar arquivos pra VPS

Do seu computador (repo local), com SSH funcionando:

```powershell
# Cria diretório de trabalho na VPS
ssh root@srv1708006.hstgr.cloud "mkdir -p /opt/mothersteam"

# Copia código-fonte (menos node_modules/dist/uploads/git) e configs
scp -r `
  server `
  deploy `
  package.json `
  root@srv1708006.hstgr.cloud:/opt/mothersteam/
```

Alternativa mais limpa: clonar direto na VPS com git (requer chave SSH configurada ou repo público).

## Fase 2 — Configurar env de produção

Na VPS:

```bash
cd /opt/mothersteam/deploy
cp .env.production.example .env.production
nano .env.production   # preencher segredos
```

Gere os segredos com:

```bash
openssl rand -base64 32   # MYSQL passwords
openssl rand -base64 48   # JWT / REFRESH secrets
```

`ELEVENLABS_API_KEY` e `ELEVENLABS_SARA_VOICE_ID` — copiar do seu `server/.env` local.

## Fase 3 — Subir containers

```bash
cd /opt/mothersteam/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Primeira vez leva uns 2-3 minutos (baixa imagens, compila o backend). Depois é segundos.

Confirme:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
# Ctrl+C pra sair dos logs
```

Deve mostrar `Server listening at http://0.0.0.0:3001`.

## Fase 4 — Criar schema no MySQL

Só na primeira vez (ou depois de mudanças no schema):

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma db push
```

Opcional — popular com dados de exemplo (mariana, fernanda, comunidades):

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma db seed
```

## Fase 5 — nginx reverse proxy

```bash
# Copia o server block
cp /opt/mothersteam/deploy/nginx-api.santoti.com.conf \
   /etc/nginx/sites-available/api.santoti.com

# Ativa
ln -s /etc/nginx/sites-available/api.santoti.com \
      /etc/nginx/sites-enabled/api.santoti.com

# Valida sintaxe
nginx -t

# Recarrega
systemctl reload nginx
```

## Fase 6 — Cloudflare SSL

No painel Cloudflare:

1. Menu **SSL/TLS** → **Overview**
2. Modo: escolher **Full** (ideal) ou **Flexible** (mais simples).
   - **Flexible:** Cloudflare↔user é HTTPS, Cloudflare↔VPS é HTTP. Funciona já com nginx só na 80.
   - **Full:** HTTPS end-to-end. Requer certificado no origin — Cloudflare oferece **Origin Certificate** grátis (Menu SSL/TLS → Origin Server → Create Certificate). Instalar no nginx e ajustar server block pra listen 443 ssl. **Preferível pra produção.**

Pra começar, Flexible resolve. Migração pra Full pode vir depois.

## Fase 7 — Testar

```bash
# Do próprio VPS
curl http://127.0.0.1:3001/health
# → {"status":"ok"}

# Do seu computador
curl https://api.santoti.com/health
# → {"status":"ok"}   (pode demorar uns 30s pro Cloudflare propagar)
```

Se der 502 Bad Gateway do Cloudflare, geralmente:
- Container do api caiu (verificar `docker compose logs api`)
- nginx errou (verificar `journalctl -u nginx -n 50`)
- Firewall bloqueando 80 (`ufw status` — se ativo, abrir 80)

## Comandos úteis pós-deploy

```bash
# Ver logs em tempo real
docker compose -f docker-compose.prod.yml logs -f api

# Restart do backend (após atualizar código)
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d api

# Backup do MySQL
docker compose -f docker-compose.prod.yml exec mysql \
  mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" mothers_team > backup-$(date +%F).sql

# Restart limpo (mantém volumes, só reinicia processos)
docker compose -f docker-compose.prod.yml restart

# NUCLEAR — apaga tudo (volumes inclusive)
docker compose -f docker-compose.prod.yml down -v
```

## Update de código

Quando quiser subir mudanças:

```bash
# No seu PC (repo local)
scp -r server root@srv1708006.hstgr.cloud:/opt/mothersteam/

# Na VPS
cd /opt/mothersteam/deploy
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d api

# Se mudou o schema Prisma
docker compose -f docker-compose.prod.yml exec api npx prisma db push
```
