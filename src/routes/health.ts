import { Router, Request, Response } from 'express';
import { db } from '../config/database.js';
import { checkDatabaseConnection } from '../config/database.js';
import { isOpenAIAvailable } from '../services/openai.js';
import { isPerplexityAvailable } from '../services/perplexity.js';
import { env } from '../config/env.js';

const router = Router();

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'thecookflow-api',
    version: env.API_VERSION,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const checks = {
      database: false,
      openai: false,
      perplexity: false,
      googlePlay: false,
      storage: false
    };

    // Check database
    checks.database = await checkDatabaseConnection();

    // Check AI services
    checks.openai = isOpenAIAvailable();
    checks.perplexity = isPerplexityAvailable();

    // Check Google Play
    checks.googlePlay = !!env.GOOGLE_PLAY_PUBLIC_KEY_B64;

    // Check storage
    checks.storage = !!env.GCS_BUCKET_NAME;

    const allHealthy = Object.values(checks).every(v => v === true || v === false);

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      version: env.API_VERSION,
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness check
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if database is ready
    const dbReady = await checkDatabaseConnection();

    if (!dbReady) {
      return res.status(503).json({
        ready: false,
        reason: 'Database not ready'
      });
    }

    res.json({
      ready: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: 'Readiness check failed'
    });
  }
});

// Liveness check
router.get('/live', (req: Request, res: Response) => {
  res.json({
    live: true,
    timestamp: new Date().toISOString()
  });
});

export default router;