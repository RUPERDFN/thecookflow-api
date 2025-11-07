# Overview

TheCookFlow API is an Express.js backend service that powers an AI-driven meal planning and grocery optimization platform. The system uses a multi-tier AI architecture with OpenAI GPT-4 as the primary engine, Perplexity AI as a fallback, and an offline recipe library as the final fallback layer. The API integrates with Google Play Billing for Android subscription management, Firebase for authentication and cloud messaging, and Google Cloud Storage for file management. The platform includes features like recipe management, automated shopping list generation, gamification with achievements and XP, and AI-powered food recognition.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Backend Framework
- **Express.js with TypeScript**: Modern Node.js framework using ES modules (NodeNext) for type-safe server-side development
- **Multi-stage middleware pipeline**: Security headers (Helmet with CSP nonces), CORS, compression, rate limiting, session management
- **Session storage**: PostgreSQL-backed sessions using connect-pg-simple for persistent user sessions

## Database Layer
- **ORM**: Drizzle ORM with Neon serverless Postgres driver
- **Schema management**: Shared schema package (@thecookflow/shared) used across projects
- **Connection**: Serverless-optimized connection pooling via Neon HTTP driver
- **Schema structure**: Users, recipes (dual-layer: user recipes and library recipes), menu plans, shopping lists, achievements, user statistics, Google Play purchases, menu generation limits

## AI Services Architecture
- **Three-tier fallback system**:
  1. Primary: OpenAI GPT-4 (structured JSON prompts for menu generation)
  2. Fallback: Perplexity AI (sonar-medium-chat model with citations)
  3. Final fallback: Offline recipe library (local database queries with filtering)
- **Menu generation**: Weekly meal plans with nutritional info, cost estimates, ingredient categorization
- **Recipe suggestions**: Context-aware recommendations based on preferences, allergies, available ingredients
- **Vision capabilities**: Image-based ingredient identification (OpenAI vision models)

## Authentication & Authorization
- **JWT-based authentication**: 7-day token expiry, signed with JWT_SECRET
- **Session management**: Hybrid approach using both JWT tokens and server-side sessions
- **Password hashing**: bcrypt with 10 rounds
- **Role-based access**: Admin routes protected with requireAdmin middleware
- **Multiple auth providers**: Email/password and OAuth support

## Google Play Integration
- **Billing verification**: Server-side purchase token validation using Google Play Developer API
- **Subscription management**: Auto-renewal tracking, expiry monitoring, purchase deduplication
- **Security**: RSA signature verification using GOOGLE_PLAY_PUBLIC_KEY
- **Service account auth**: Firebase service account (base64-encoded JSON) for API access

## Security Middleware
- **Helmet**: Dynamic CSP with per-request nonces for inline scripts/styles
- **Rate limiting**: Tiered rate limits (API-wide, auth-specific endpoints)
- **CORS**: Configurable allowed origins from environment
- **Trust proxy**: Production configuration for reverse proxy/load balancer scenarios
- **Input validation**: Zod schemas for request body validation across all routes

## File Storage
- **Google Cloud Storage**: Profile images, recipe photos, generated content
- **Authentication**: Service account key-based (GCS_SERVICE_ACCOUNT_KEY)
- **Bucket organization**: Single bucket (GCS_BUCKET_NAME) with path-based organization

## Logging & Monitoring
- **Pino logger**: Structured JSON logging with contextual child loggers per module
- **Development mode**: Pretty-printed logs with pino-pretty transport
- **Production mode**: JSON output for log aggregation
- **Serializers**: Custom serializers for requests, responses, and errors

## Gamification System
- **XP tracking**: Experience points awarded for various actions
- **Level calculation**: Shared utility functions for level progression
- **Achievements**: Unlockable achievements with completion tracking
- **User statistics**: Comprehensive stats (menus created, recipes saved, etc.)

## API Structure
- **Versioned routes**: `/api/v1/*` with legacy route support
- **Route modules**: Auth, menu, recipes, user, billing, gamification, health, admin
- **Android App Links**: Deep linking support via `.well-known/assetlinks.json`
- **Health checks**: Basic and detailed health endpoints for monitoring

## Environment Configuration
- **Strict validation**: Zod-based environment variable validation on startup
- **Required secrets**: JWT_SECRET (32+ chars), SESSION_SECRET, DATABASE_URL
- **Optional services**: AI keys, Google Play credentials, GCS config can be omitted for degraded operation
- **Feature flags**: ENABLE_DEMO_MODE, ENABLE_STAGING_FEATURES for conditional features

## Error Handling
- **Global error handler**: Centralized error middleware with logging
- **404 handler**: Not found middleware for undefined routes
- **Validation errors**: Zod validation errors with detailed messages
- **Service degradation**: Graceful fallback when external services unavailable

# External Dependencies

## AI Providers
- **OpenAI API**: GPT-4 for menu generation, recipe suggestions, vision tasks
- **Perplexity AI**: Fallback AI service for menu generation when OpenAI unavailable

## Google Services
- **Google Play Developer API**: Subscription verification and management
- **Google Cloud Storage**: File storage for images and user-generated content
- **Firebase Admin SDK**: Push notifications (FCM), additional authentication

## Database
- **Neon Postgres**: Serverless PostgreSQL database with HTTP driver
- **Connection string**: DATABASE_URL environment variable

## Authentication
- **JWT**: jsonwebtoken library for token generation and verification
- **bcrypt**: Password hashing and comparison

## Development Tools
- **TypeScript**: Type-safe development with strict compiler options
- **tsx**: Development runtime for TypeScript execution
- **Drizzle Kit**: Database schema migrations and studio UI
- **ESLint**: Code linting with TypeScript-specific rules

## Android Integration
- **Google Play Billing**: In-app subscription management (billing-ktx 7.0.0)
- **Firebase Cloud Messaging**: Push notification delivery
- **App verification**: SHA-256 certificate fingerprints for deep linking

## Infrastructure
- **Docker**: Multi-stage production builds
- **Session store**: PostgreSQL table for session persistence
- **HTTP server**: Node.js http module with Express app