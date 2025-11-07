# Multi-stage Dockerfile para TheCookFlow API (sin filtrar secretos en build)
# Ajustado para PORT=3000 y sin npm ci (no hay package-lock.json)

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat git openssh
# Configure Git credentials for private dependencies
ARG GITHUB_TOKEN
RUN git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
# Solo los manifiestos para instalar deps de runtime
COPY package.json ./
# Si tienes package-lock.json en el futuro, copia también y usa npm ci
# COPY package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev && npm cache clean --force

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git openssh
# Configure Git credentials for private dependencies
ARG GITHUB_TOKEN
RUN git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
# Manifiestos para instalar TODAS las deps (incluye dev)
COPY package.json ./
# Si más adelante tienes lockfile:
# COPY package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copia el código fuente y compila
COPY . .
# Asegúrate de tener "build": "tsc" (o tu bundler) en package.json
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Usuario no root + dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && \
    apk add --no-cache dumb-init

# Copiamos solo lo necesario
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist

# Variables por defecto (puedes sobrescribir en Coolify en runtime)
ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000
USER nodejs

# Healthcheck coherente con PORT
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/healthz', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

ENTRYPOINT ["dumb-init","--"]
CMD ["node","dist/index.js"]
