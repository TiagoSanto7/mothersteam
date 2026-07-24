# Dockerfile do backend Fastify — Mother's Team API
# Build multi-stage: primeiro compila TS, depois copia só o resultado.
# Usa Debian slim em vez de Alpine porque bcrypt+prisma se dão melhor com glibc.

# ─────────────────────────────────────────────────────────────
# Stage 1: build
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app

# openssl é dependência runtime do Prisma query engine
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Instala deps primeiro (aproveita cache do Docker se package.json não mudou)
COPY server/package*.json ./
RUN npm ci

# Copia código e schema, gera Prisma Client, compila TS
COPY server/ ./
RUN npx prisma generate && npm run build

# ─────────────────────────────────────────────────────────────
# Stage 2: runtime enxuta
# ─────────────────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Copia só o essencial pra rodar
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package*.json ./

# Diretório de uploads (será montado como volume no compose)
RUN mkdir -p uploads

EXPOSE 3001

# Roda direto o compilado — sem npm start pra não gastar processo
CMD ["node", "dist/index.js"]
