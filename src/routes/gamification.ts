import { Router, Request, Response } from 'express';
import { db } from '../config/database.js';
import {
  userStats,
  achievements
} from '@ruperdfn/thecookflow-shared/schemas';
import { eq, and, gte } from 'drizzle-orm';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { calculateLevel, getNextLevelXP } from '@ruperdfn/thecookflow-shared/utils';

const router = Router();
const gamificationLogger = logger.child({ module: 'gamification-routes' });

// Award XP to user
router.post('/award-xp', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid XP amount'
      });
    }

    // Get current stats
    const [stats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, req.user.id))
      .limit(1);

    const currentXP = stats?.experiencePoints || 0;
    const newXP = currentXP + amount;
    const oldLevel = calculateLevel(currentXP);
    const newLevel = calculateLevel(newXP);

    // Update XP and level
    await db
      .update(userStats)
      .set({
        experiencePoints: newXP,
        level: newLevel,
        updatedAt: new Date()
      })
      .where(eq(userStats.userId, req.user.id));

    // Check for level up
    const leveledUp = newLevel > oldLevel;

    if (leveledUp) {
      // Award level up achievement
      await awardAchievement(req.user.id, `level_${newLevel}`, `Reached Level ${newLevel}`);
    }

    gamificationLogger.info({ 
      userId: req.user.id, 
      xpAwarded: amount, 
      reason,
      leveledUp 
    }, 'XP awarded');

    res.json({
      success: true,
      data: {
        xpAwarded: amount,
        totalXP: newXP,
        level: newLevel,
        leveledUp,
        nextLevelXP: getNextLevelXP(newLevel)
      }
    });
  } catch (error) {
    gamificationLogger.error({ error, userId: req.user?.id }, 'Failed to award XP');
    res.status(500).json({
      success: false,
      error: 'Failed to award XP'
    });
  }
});

// Update streak
router.post('/update-streak', authenticateToken, async (req: AuthRequest, res: Response) => {
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

    const currentStreak = (stats?.currentStreak || 0) + 1;
    const longestStreak = Math.max(currentStreak, stats?.longestStreak || 0);

    await db
      .update(userStats)
      .set({
        currentStreak,
        longestStreak,
        lastActiveAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userStats.userId, req.user.id));

    // Check for streak achievements
    const streakMilestones = [3, 7, 14, 30, 60, 100];
    for (const milestone of streakMilestones) {
      if (currentStreak === milestone) {
        await awardAchievement(
          req.user.id, 
          `streak_${milestone}`, 
          `${milestone} Day Streak!`
        );
      }
    }

    res.json({
      success: true,
      data: {
        currentStreak,
        longestStreak
      }
    });
  } catch (error) {
    gamificationLogger.error({ error, userId: req.user?.id }, 'Failed to update streak');
    res.status(500).json({
      success: false,
      error: 'Failed to update streak'
    });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { type = 'xp', limit = 10 } = req.query;

    let orderBy;
    switch (type) {
      case 'streak':
        orderBy = userStats.currentStreak;
        break;
      case 'menus':
        orderBy = userStats.menusGenerated;
        break;
      case 'recipes':
        orderBy = userStats.recipesCooked;
        break;
      default:
        orderBy = userStats.experiencePoints;
    }

    const leaderboard = await db
      .select({
        userId: userStats.userId,
        experiencePoints: userStats.experiencePoints,
        level: userStats.level,
        currentStreak: userStats.currentStreak,
        menusGenerated: userStats.menusGenerated,
        recipesCooked: userStats.recipesCooked
      })
      .from(userStats)
      .orderBy(orderBy)
      .limit(Number(limit));

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    gamificationLogger.error({ error }, 'Failed to get leaderboard');
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    });
  }
});

// Helper function to award achievement
async function awardAchievement(
  userId: string, 
  achievementId: string, 
  title: string
): Promise<void> {
  try {
    // Check if already awarded
    const existing = await db
      .select()
      .from(achievements)
      .where(and(
        eq(achievements.userId, userId),
        eq(achievements.achievementId, achievementId)
      ))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(achievements).values({
        userId,
        achievementId,
        title,
        unlockedAt: new Date()
      });

      gamificationLogger.info({ 
        userId, 
        achievementId, 
        title 
      }, 'Achievement unlocked');
    }
  } catch (error) {
    gamificationLogger.error({ error, userId, achievementId }, 'Failed to award achievement');
  }
}

export default router;