import { Router, Request, Response } from 'express';
import { db } from '../config/database.js';
import { users, menuPlans, recipes } from '@thecookflow/shared/schemas';
import { desc, count } from 'drizzle-orm';
import { authenticateToken, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();
const adminLogger = logger.child({ module: 'admin-routes' });

// Get system statistics
router.get('/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get user counts
    const totalUsers = await db
      .select({ count: count() })
      .from(users);

    const premiumUsers = await db
      .select({ count: count() })
      .from(users)
      .where(db.sql`is_premium = true`);

    // Get menu counts
    const totalMenus = await db
      .select({ count: count() })
      .from(menuPlans);

    // Get recipe counts
    const totalRecipes = await db
      .select({ count: count() })
      .from(recipes);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers[0]?.count || 0,
          premium: premiumUsers[0]?.count || 0,
          free: (totalUsers[0]?.count || 0) - (premiumUsers[0]?.count || 0)
        },
        content: {
          menus: totalMenus[0]?.count || 0,
          recipes: totalRecipes[0]?.count || 0
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    adminLogger.error({ error }, 'Failed to get admin stats');
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

// Get recent users
router.get('/users/recent', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const recentUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isPremium: users.isPremium,
        provider: users.provider,
        createdAt: users.createdAt
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(20);

    res.json({
      success: true,
      data: recentUsers
    });
  } catch (error) {
    adminLogger.error({ error }, 'Failed to get recent users');
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
});

// System health overview
router.get('/health-overview', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const healthData = {
      apiVersion: process.env.API_VERSION || '1.0.0',
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: healthData
    });
  } catch (error) {
    adminLogger.error({ error }, 'Failed to get health overview');
    res.status(500).json({
      success: false,
      error: 'Failed to get health data'
    });
  }
});

export default router;