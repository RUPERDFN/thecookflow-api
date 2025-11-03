import { Express } from 'express';
import authRoutes from './auth.js';
import menuRoutes from './menu.js';
import recipeRoutes from './recipe.js';
import userRoutes from './user.js';
import billingRoutes from './billing.js';
import gamificationRoutes from './gamification.js';
import healthRoutes from './health.js';
import adminRoutes from './admin.js';
import { logger } from '../utils/logger.js';

export function registerRoutes(app: Express): void {
  const routeLogger = logger.child({ module: 'routes' });

  // App Links for Android App verification
  app.get('/.well-known/assetlinks.json', (_req, res) => {
    res.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.cookflow.app",
          sha256_cert_fingerprints: [
            // Production certificate fingerprint
            "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C"
          ]
        }
      }
    ]);
  });

  // API v1 routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/menu', menuRoutes);
  app.use('/api/v1/recipes', recipeRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/billing', billingRoutes);
  app.use('/api/v1/gamification', gamificationRoutes);
  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // Legacy routes for backward compatibility
  app.use('/api/auth', authRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/recipes', recipeRoutes);
  app.use('/api/users', userRoutes);

  routeLogger.info('All routes registered successfully');
}