import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/database.js';
import { users, userStats, achievements } from '@ruperdfn/thecookflow-shared/schemas';
import { eq } from 'drizzle-orm';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();
const userLogger = logger.child({ module: 'user-routes' });

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const updateSchema = z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phoneNumber: z.string().optional(),
      birthDate: z.string().optional(),
      dietaryPreferences: z.object({
        diet: z.string().optional(),
        allergies: z.array(z.string()).optional(),
        dislikes: z.array(z.string()).optional()
      }).optional()
    });

    const data = updateSchema.parse(req.body);

    const [updatedUser] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(users.id, req.user.id))
      .returning();

    userLogger.info({ userId: req.user.id }, 'Profile updated');

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    userLogger.error({ error, userId: req.user?.id }, 'Failed to update profile');
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const [stats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, req.user.id))
      .limit(1);

    if (!stats) {
      // Create default stats if not exist
      const [newStats] = await db
        .insert(userStats)
        .values({
          userId: req.user.id,
          menusGenerated: 0,
          recipesCooked: 0,
          shoppingListsCompleted: 0,
          currentStreak: 0,
          longestStreak: 0,
          experiencePoints: 0,
          level: 1
        })
        .returning();

      return res.json({
        success: true,
        data: newStats
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    userLogger.error({ error, userId: req.user?.id }, 'Failed to get user stats');
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

// Get user achievements
router.get('/achievements', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userAchievements = await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, req.user.id));

    res.json({
      success: true,
      data: userAchievements
    });
  } catch (error) {
    userLogger.error({ error, userId: req.user?.id }, 'Failed to get achievements');
    res.status(500).json({
      success: false,
      error: 'Failed to get achievements'
    });
  }
});

// Delete account
router.delete('/account', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Soft delete - mark account as deleted
    await db
      .update(users)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, req.user.id));

    userLogger.info({ userId: req.user.id }, 'Account deleted');

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    userLogger.error({ error, userId: req.user?.id }, 'Failed to delete account');
    res.status(500).json({
      success: false,
      error: 'Failed to delete account'
    });
  }
});

export default router;