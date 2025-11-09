import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Nonce middleware for CSP
export const nonceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.locals.nonce = nanoid(16);
  next();
};

// Dynamic helmet configuration with nonce
export const getHelmetConfig = (nonce: string) => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          `'nonce-${nonce}'`,
          "https://www.googletagmanager.com",
          "https://pagead2.googlesyndication.com",
          "https://www.google-analytics.com",
          env.isDev ? "'unsafe-eval'" : "",
        ].filter(Boolean),
        styleSrc: [
          "'self'",
          `'nonce-${nonce}'`,
          "'unsafe-inline'", // Required for styled components
          "https://fonts.googleapis.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "https://storage.googleapis.com",
        ],
        connectSrc: [
          "'self'",
          "https://api.openai.com",
          "https://api.perplexity.ai",
          "https://www.google-analytics.com",
          "https://storage.googleapis.com",
          env.isDev ? "ws://localhost:*" : "",
        ].filter(Boolean),
        mediaSrc: ["'self'", "blob:", "data:"],
        objectSrc: ["'none'"],
        childSrc: ["'self'", "blob:"],
        workerSrc: ["'self'", "blob:"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: env.isProd ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Disabled for third-party integrations
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
};

// CORS configuration
// Rate limiting configuration
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isProd ? 100 : 1000, // Limit requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/healthz' || req.path === '/api/health';
  },
});

// Auth rate limiting (stricter)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 auth attempts per window
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Upload rate limiting
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: 'Too many uploads, please try again later.',
});

// Global error handler
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error({
    error: err,
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
    },
  });

  // Don't leak error details in production
  const isDev = env.isDev;
  const statusCode = err.statusCode || err.status || 500;
  const message = isDev ? err.message : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(isDev && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString(),
  });
};