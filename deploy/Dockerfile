# Dockerfile do backend Fastify — Mother's Team API
#
# Estratégia: rodar em produção com tsx (mesmo runtime do dev) em vez de compilar
# com tsc. Motivo: o backend é ESM (`"type": "module"` no package.json), e o
# tsconfig usa `moduleResolution: "bundler"` — os imports do source não têm
# extensão `.js`, então o output do tsc quebra em Node ESM na hora de resolver.
# tsx resolve TS + ESM na hora sem exigir mudanças no código-fonte.
#
# Trade-off: tsx usa um pouco mais de RAM (JIT transpilation) mas é irrelevante
# pra o porte desse app. Elimina toda a superfície de bugs de build.
#
# Usa Debian slim em vez de Alpine porque bcrypt+prisma se dão melhor com glibc.

FROM node:20-slim

WORKDIR /app

# openssl é dependência runtime do Prisma query engine
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Instala deps primeiro (aproveita cache do Docker se package.json não mudou)
COPY server/package*.json ./
RUN npm ci

# Copia código-fonte + schema Prisma
COPY server/ ./

# Gera o Prisma Client (schema → client TS/JS pra rodar queries)
RUN npx prisma generate

# Diretório de uploads (será montado como volume no compose)
RUN mkdir -p uploads

EXPOSE 3001

# Roda com tsx direto do source — sem etapa de build
CMD ["npx", "tsx", "src/index.ts"]
