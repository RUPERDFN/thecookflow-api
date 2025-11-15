# ======================================
# STAGE 1: Builder - Compilar TypeScript
# ======================================
FROM node:20-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production

# Activar pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# 🔐 Recibir el token como build arg desde Coolify
ARG NODE_AUTH_TOKEN
ENV NODE_AUTH_TOKEN=$NODE_AUTH_TOKEN

# 🔐 Copiar la config de npm que usa NODE_AUTH_TOKEN
COPY .npmrc .npmrc

# Copiar manifests de dependencias
COPY package.json pnpm-lock.yaml* ./

# Instalar dependencias usando GitHub Packages con el token
RUN pnpm install --frozen-lockfile

# Copiar el resto del código y construir
COPY . .
RUN pnpm run build

# ======================================
# STAGE 2: Runner - Imagen final ligera
# ======================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Habilitar corepack para pnpm
RUN corepack enable

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml* ./

# Instalar solo dependencias de producción
RUN pnpm install --prod --frozen-lockfile

# Copiar código compilado desde builder
COPY --from=builder /app/dist ./dist

EXPOSE 5000

# Healthcheck para monitoreo
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/health || exit 1

# Ejecutar aplicación
CMD ["node", "dist/index.js"]
