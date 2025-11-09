# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile=false

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache curl
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json pnpm-lock.yaml* ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD curl -f http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/index.js"]
