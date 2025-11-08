# build
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package*.json ./
COPY pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
COPY scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh
USER app
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["bash","-lc","./scripts/start.sh"]
