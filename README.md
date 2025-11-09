# 🍳 TheCookFlow API

Backend service that powers TheCookFlow with Express, TypeScript, and PostgreSQL integrations. The project is wired for CI/CD, container builds, and Coolify deployments.

## 🚀 Tech Stack

- **Runtime**: Node.js 20 (via Corepack + pnpm)
- **Language**: TypeScript (strict mode, ES2022)
- **Framework**: Express with Drizzle ORM, Zod validation, and session support backed by PostgreSQL
- **AI Integrations**: OpenAI & Perplexity service stubs
- **Tooling**: ESLint, Prettier, Vitest, Husky, lint-staged, Commitlint

## 📁 Project Layout

```
src/
├── config/          # Environment + database config
├── middleware/      # Security, auth, rate limiting, CSP helpers
├── routes/          # Express routers (v1 + legacy compatibility)
├── services/        # External integrations (AI, billing, storage)
├── types/           # Shared TypeScript types
├── utils/           # Logger and shared utilities
└── index.ts         # Express bootstrap + global wiring
```

## ✅ Requirements

- Node.js **20 or newer** (`corepack enable` recommended)
- pnpm (managed automatically by Corepack)
- Docker (optional, for container builds)
- Access to the private [`@thecookflow/shared`](https://github.com/RUPERDFN/thecookflow-shared) repository (used for Drizzle schemas)

## ⚙️ Environment Variables

Copy `.env.example` and adjust to your needs:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development`, `test` or `production` |
| `PORT` | HTTP port (defaults to `3000`) |
| `CORS_ORIGIN` | Comma-separated list of allowed origins or `*` |
| `ALLOWED_ORIGINS` | Optional comma-separated list to override CORS defaults |
| `JWT_SECRET` | Minimum 32 characters; used for API auth |
| `SESSION_SECRET` | Optional override for session signing (falls back to `JWT_SECRET`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | Optional key for OpenAI integration |
| `PERPLEXITY_API_KEY` | Optional key for Perplexity integration |
| `GOOGLE_PLAY_PUBLIC_KEY` | Optional Play billing public key (PEM or base64) |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64` | Optional base64 encoded service account JSON |
| `GCS_BUCKET_NAME` / `GCS_SERVICE_ACCOUNT_KEY` | Optional Google Cloud Storage configuration |
| `FIREBASE_SERVICE_ACCOUNT` | Optional Firebase service account JSON |
| `COOLIFY_WEBHOOK_URL` | Secret webhook URL used by the deploy workflow |

All example values are safe no-op placeholders, so no external calls are triggered during CI or QA.

## 🧑‍💻 Local Development

```bash
corepack enable
pnpm install
pnpm dev
```

The development server listens on **http://localhost:3000** by default. Update the `PORT` variable to change it.

### Available pnpm Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the API with live reload via `tsx watch` |
| `pnpm build` | Emit the production build into `dist/` |
| `pnpm start` | Launch the compiled build (`dist/index.js`) |
| `pnpm lint` | Run ESLint across the codebase |
| `pnpm format` | Apply Prettier formatting across the repo |
| `pnpm typecheck` | Run TypeScript in no-emit mode |
| `pnpm test` | Execute Vitest test suites (passes even with zero specs) |
| `pnpm qa` | Composite command: lint → typecheck → tests |

## 🧪 Quality Gates

- **ESLint** with `@typescript-eslint` enforces TypeScript best practices.
- **Prettier** ensures consistent formatting via lint-staged on staged files.
- **Husky** hooks run lint-staged before every commit and Commitlint validates Conventional Commit messages.
- **CI Workflow** (`.github/workflows/ci.yml`) installs dependencies and runs `pnpm lint`, `pnpm typecheck`, and `pnpm test --if-present` on pushes/PRs targeting `develop`, `staging`, or `main`.

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

Core public endpoints exposed in addition to the v1 feature routes:

- `GET /api/health` → `{ ok: true, service: "api", ts: "<ISO timestamp>" }`
- `POST /api/chef` with body `{ "prompt": "..." }` → `{ "reply": "stub" }`
- `GET /api/subscription-status?userId=<id>` → `{ "status": "free|premium", "until": null|"<ISO>" }`

The `/api/v1/**` routers offer the authenticated application features (auth, menu planning, billing, gamification, admin tools, etc.) while the new lightweight endpoints stay mock-only to avoid external network calls during testing.

## 📦 Release Checklist

- [ ] Update environment variables and secrets as needed
- [ ] Run `pnpm qa`
- [ ] Build the Docker image (`docker build -t thecookflow-api .`)
- [ ] Ensure `COOLIFY_WEBHOOK_URL` secret is configured in GitHub

## 📝 License

[MIT](./LICENSE)
