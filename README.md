# 🍳 TheCookFlow API

Minimal Node.js HTTP service prepared for automated quality gates, container delivery, and Coolify deployments.

## 🚀 Stack Overview

- **Runtime**: Node.js 20 (managed via Corepack + pnpm)
- **Language**: TypeScript (ES2022, strict mode)
- **Web Framework**: Lightweight Node.js HTTP router exposing Express-compatible endpoints
- **Logging**: Pino with pretty transport in development
- **Tooling**: ESLint, Prettier, Vitest, Husky, lint-staged, Commitlint

## 📁 Project Layout

```
src/
├── app.ts          # HTTP application and routes
├── index.ts        # HTTP server bootstrap & graceful shutdown
└── lib/
    └── logger.ts   # Centralised Pino logger
```

## ✅ Requirements

- Node.js **20 or newer** (`corepack enable` recommended)
- pnpm (managed automatically by Corepack)
- Docker (optional, for container builds)

## ⚙️ Environment Variables

Copy `.env.example` and adjust to your needs:

```
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development`, `test` or `production` |
| `PORT` | HTTP port (defaults to `3000`) |
| `CORS_ORIGIN` | Comma-separated list of allowed origins or `*` |
| `JWT_SECRET` | Placeholder for future authentication work |
| `DATABASE_URL` | Placeholder for future database connectivity |
| `OPENAI_API_KEY` | Placeholder for AI provider integration |
| `PERPLEXITY_API_KEY` | Placeholder for alternative AI provider |
| `COOLIFY_WEBHOOK_URL` | Secret webhook URL used by deployment workflow |

All example values are safe no-op placeholders, so no external calls are triggered during CI or QA.

## 🧑‍💻 Local Development

```bash
corepack enable
pnpm install
pnpm dev
```

The development server listens on **http://localhost:3000** by default. Update the `PORT` variable to change it.

### Available npm Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the API with live reload via `tsx watch` |
| `pnpm build` | Emit the production build into `dist/` |
| `pnpm start` | Launch the compiled build (`dist/index.js`) |
| `pnpm lint` | Run ESLint across the codebase |
| `pnpm format` | Verify formatting using Prettier |
| `pnpm typecheck` | Run TypeScript in no-emit mode |
| `pnpm test` | Execute Vitest test suites (passes even with zero specs) |
| `pnpm qa` | Composite command: lint → typecheck → tests |

## 🧪 Quality Gates

- **ESLint** with `@typescript-eslint` enforces TypeScript best practices.
- **Prettier** ensures consistent formatting via lint-staged on staged files.
- **Husky** hooks run lint-staged before every commit and Commitlint validates Conventional Commit messages.
- **CI Workflow** (`.github/workflows/ci.yml`) installs dependencies and runs `pnpm lint`, `pnpm typecheck`, and `pnpm test --if-present` on pushes and pull requests targeting `develop`, `staging`, or `main`.

## 🧱 Building & QA

```bash
pnpm build        # Compile TypeScript to dist/
pnpm qa           # Run lint + typecheck + tests
```

The compiled artifacts reside in `dist/` and are ready for container packaging.

## 🐳 Docker

Build and run the production image:

```bash
docker build -t thecookflow-api .
docker run --rm -p 3000:3000 --env-file .env thecookflow-api
```

The container exposes port **3000** and has an HTTP health check hitting `/api/health`.

## ☁️ Coolify Deployment

1. Configure a Coolify webhook and store its URL as the GitHub secret `COOLIFY_WEBHOOK_URL`.
2. Push commits to `develop`, `staging`, or `main`.
3. The `deploy.yml` workflow will `curl` the webhook, triggering Coolify to pull and deploy the latest container image.

## 🔌 API Surface

All endpoints are namespaced under `/api`:

- `GET /api/health` → `{ ok: true, service: "api", ts: "<ISO timestamp>" }`
- `POST /api/chef` with body `{ "prompt": "..." }` → `{ "reply": "stub" }`
- `GET /api/subscription-status?userId=<id>` → `{ "status": "free|premium", "until": null|"<ISO>" }`

These endpoints are intentionally lightweight placeholders, ready for future integrations without performing any external network calls.

## 📦 Release Checklist

- [ ] Update environment variables and secrets as needed
- [ ] Run `pnpm qa`
- [ ] Build the Docker image (`docker build -t thecookflow-api .`)
- [ ] Ensure `COOLIFY_WEBHOOK_URL` secret is configured in GitHub

## 📝 License

[MIT](./LICENSE)
