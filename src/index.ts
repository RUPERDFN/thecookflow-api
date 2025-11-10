import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { validateEnv, logEnvConfig } from "./config/env.js";
import { registerRoutes } from "./routes/index.js";
import {
  apiRateLimit,
  getHelmetConfig,
  nonceMiddleware,
  globalErrorHandler,
  notFoundHandler
} from "./middleware/security.js";
import { logger } from "./utils/logger.js";
import { createServer } from "http";

// Validate environment variables on startup
const envConfig = validateEnv();
logEnvConfig();

const app = express();
const isProduction = envConfig.NODE_ENV === "production";
const port = Number.parseInt(envConfig.PORT ?? "3000", 10) || 3000;

// Create PostgreSQL session store
const PgSession = connectPgSimple(session);

// Fix for production environment path resolution
if (isProduction && !process.env.INIT_CWD) {
  process.env.INIT_CWD = process.cwd();
}

// Trust proxy for production (behind reverse proxy/load balancer)
if (isProduction) {
  app.set('trust proxy', 1);
}

const allowedOrigins = envConfig.ALLOWED_ORIGINS_LIST;

if (allowedOrigins.length === 0) {
  logger.warn("CORS is configured without any allowed origins; all browser requests will be blocked.");
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
// Security middleware
app.use(compression());

// Nonce generation for CSP
app.use(nonceMiddleware);

// Dynamic helmet configuration with nonce
app.use((req: Request, res: Response, next: NextFunction) => {
  const helmetMiddleware = getHelmetConfig(res.locals.nonce);
  helmetMiddleware(req, res, next);
});

// Rate limiting for API routes
app.use('/api/', apiRateLimit);

// Session configuration
app.use(session({
  store: new PgSession({
    conString: envConfig.DATABASE_URL,
    createTableIfMissing: true,
    ttl: 30 * 24 * 60 * 60 // 30 days
  }),
  name: "tcf.sid",
  secret: envConfig.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

// Basic middleware
app.use(express.json({ 
  limit: "10mb",
  verify: (req: any, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Add nonce to locals for templates
app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.cspNonce = res.locals.nonce;
  next();
});

// Health check endpoints
app.get('/healthz', (_req, res) => {
  res.status(200).json({ 
    ok: true, 
    service: 'thecookflow-api',
    timestamp: new Date().toISOString() 
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "api",
    ts: new Date().toISOString()
  });
});

app.post("/api/chef", (req: Request, res: Response) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  logger.info({ promptPreview: prompt.slice(0, 40) }, "Chef endpoint invoked with stub response");
  return res.status(200).json({ reply: "stub" });
});

app.get("/api/subscription-status", (req: Request, res: Response) => {
  const { userId } = req.query;

  if (typeof userId !== "string" || userId.trim().length === 0) {
    return res.status(400).json({ error: "userId query parameter is required" });
  }

  const isPremium = userId.length % 2 === 0;
  const until = isPremium ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() : null;

  return res.status(200).json({
    status: isPremium ? "premium" : "free",
    until
  });
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      logger.info({
        method: req.method,
        path,
        statusCode: res.statusCode,
        duration,
        response: capturedJsonResponse
      });
    }
  });

  next();
});

// Register all API routes
registerRoutes(app);

// Error handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start server
const server = createServer(app);

server.listen(port, () => {
  logger.info(`🚀 TheCookFlow API running on port ${port}`);
  logger.info(`📝 Environment: ${isProduction ? 'production' : 'development'}`);
  logger.info(`🔗 API available at http://localhost:${port}/api`);
  
  if (!isProduction) {
    logger.info(`📚 API Documentation: http://localhost:${port}/api/docs`);
  }
});

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server gracefully...');
  server.close(() => {
    logger.info('Server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;