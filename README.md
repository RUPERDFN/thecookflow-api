# 🍳 TheCookFlow API

Express.js backend API for TheCookFlow - AI-powered meal planning and grocery optimization platform.

## 🚀 Features

- **AI-Powered Menu Generation**: OpenAI GPT-4 and Perplexity integration for smart meal planning
- **Multi-tier Architecture**: Fallback system (OpenAI → Perplexity → Offline)
- **Google Play Billing**: Android subscription management with signature verification
- **Food Recognition**: AI vision for ingredient identification from photos
- **Recipe Management**: Dual-layer system for user and library recipes
- **Shopping Lists**: Auto-generated, categorized grocery lists
- **Gamification**: Achievements, XP system, and user progression
- **Security**: JWT authentication, rate limiting, CSP headers

## 🛠️ Tech Stack

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT + Session-based
- **AI Services**: OpenAI API, Perplexity API
- **File Storage**: Google Cloud Storage
- **Monitoring**: Pino logger
- **Container**: Docker with multi-stage build

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (optional)
- API Keys:
  - OpenAI API Key (recommended)
  - Perplexity API Key (optional fallback)
  - Google Play Public Key (for Android subscriptions)

## 🔧 Installation

### Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

## 🏗️ Project Structure

```
src/
├── config/          # Configuration files
│   ├── env.ts       # Environment validation
│   └── database.ts  # Database connection
├── middleware/      # Express middleware
│   ├── auth.ts      # Authentication
│   └── security.ts  # Security headers
├── routes/          # API endpoints
│   ├── auth.ts      # Authentication routes
│   ├── menu.ts      # Menu generation
│   ├── billing.ts   # Subscription management
│   └── ...
├── services/        # Business logic
│   ├── openai.ts    # OpenAI integration
│   ├── perplexity.ts # Perplexity integration
│   └── offlineMenu.ts # Fallback generation
├── types/           # TypeScript types
└── utils/           # Utility functions
```

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

### Menu Management
- `POST /api/v1/menu/generate` - Generate weekly menu
- `GET /api/v1/menu/my-menus` - Get user's menus
- `GET /api/v1/menu/:menuId` - Get specific menu
- `DELETE /api/v1/menu/:menuId` - Delete menu

### Recipes
- `GET /api/v1/recipes` - List recipes
- `POST /api/v1/recipes` - Create recipe
- `GET /api/v1/recipes/:id` - Get recipe
- `PUT /api/v1/recipes/:id` - Update recipe

### Billing
- `POST /api/v1/billing/verify-purchase` - Verify Google Play purchase
- `GET /api/v1/billing/subscription` - Get subscription status
- `POST /api/v1/billing/cancel` - Cancel subscription

## 🔒 Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/thecookflow
JWT_SECRET=your-secret-key-min-32-chars
SESSION_SECRET=your-session-secret-min-32-chars

# AI Services (at least one required)
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...

# Google Play (for Android app)
GOOGLE_PLAY_PUBLIC_KEY=MIIBIjANBgkq...

# Optional
GCS_BUCKET_NAME=thecookflow-images
ALLOWED_ORIGINS=http://localhost:3000
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📦 Building

```bash
# Build TypeScript
npm run build

# Build Docker image
docker build -t thecookflow-api .

# Build with specific tag
docker build -t ghcr.io/thecookflow/api:v1.0.0 .
```

## 🚢 Deployment

### Using Docker

```bash
# Build production image
docker build -t thecookflow-api:prod .

# Run production container
docker run -d \
  --name thecookflow-api \
  -p 5000:5000 \
  --env-file .env.production \
  thecookflow-api:prod
```

### Using PM2

```bash
# Build application
npm run build

# Start with PM2
pm2 start dist/index.js --name thecookflow-api

# Save PM2 configuration
pm2 save
pm2 startup
```

### Coolify Deployment

The API is configured for automatic deployment to Coolify:

1. Push to `main` branch triggers production deployment
2. Push to `develop` branch triggers staging deployment
3. Manual deployment via GitHub Actions workflow

## 📊 Monitoring

- Health check: `GET /healthz`
- API health: `GET /api/health`
- Metrics endpoint: `GET /api/metrics` (when enabled)

## 🔄 Database Migrations

```bash
# Generate migration from schema changes
npm run db:generate

# Push schema changes to database
npm run db:push

# Force push (destructive)
npm run db:push:force

# Open Drizzle Studio
npm run db:studio
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:
- Open an issue on GitHub
- Email: support@thecookflow.com
- Documentation: [docs.thecookflow.com](https://docs.thecookflow.com)

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Perplexity for search-enhanced AI
- Neon for serverless PostgreSQL
- Drizzle Team for the excellent ORM