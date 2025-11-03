import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/database.js';
import { 
  recipes, 
  recipeLibrary,
  recipeFavorites 
} from '@thecookflow/shared/schemas';
import { eq, and, desc, like } from 'drizzle-orm';
import { authenticateToken, optionalAuth, type AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();
const recipeLogger = logger.child({ module: 'recipe-routes' });

// Get recipe library (public recipes)
router.get('/library', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      category,
      diet,
      search,
      page = 1,
      limit = 20
    } = req.query;

    let query = db
      .select()
      .from(recipeLibrary)
      .where(eq(recipeLibrary.isApproved, true));

    // Apply filters
    if (category) {
      query = query.where(eq(recipeLibrary.category, category as string));
    }

    if (diet) {
      // Filter by dietary tags
      query = query.where(
        db.sql`${recipeLibrary.dietaryTags} @> ARRAY[${diet}]::text[]`
      );
    }

    if (search) {
      query = query.where(
        like(recipeLibrary.name, `%${search}%`)
      );
    }

    // Pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.limit(Number(limit)).offset(offset);

    const libraryRecipes = await query;

    res.json({
      success: true,
      data: {
        recipes: libraryRecipes,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    recipeLogger.error({ error }, 'Failed to get recipe library');
    res.status(500).json({
      success: false,
      error: 'Failed to get recipes'
    });
  }
});

// Get user's custom recipes
router.get('/my-recipes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRecipes = await db
      .select()
      .from(recipes)
      .where(eq(recipes.userId, req.user.id))
      .orderBy(desc(recipes.createdAt));

    res.json({
      success: true,
      data: userRecipes
    });
  } catch (error) {
    recipeLogger.error({ error, userId: req.user?.id }, 'Failed to get user recipes');
    res.status(500).json({
      success: false,
      error: 'Failed to get recipes'
    });
  }
});

// Get user's favorite recipes
router.get('/favorites', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const favorites = await db
      .select({
        recipe: recipeLibrary,
        favoritedAt: recipeFavorites.createdAt
      })
      .from(recipeFavorites)
      .innerJoin(
        recipeLibrary,
        eq(recipeFavorites.recipeId, recipeLibrary.id)
      )
      .where(eq(recipeFavorites.userId, req.user.id))
      .orderBy(desc(recipeFavorites.createdAt));

    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    recipeLogger.error({ error, userId: req.user?.id }, 'Failed to get favorite recipes');
    res.status(500).json({
      success: false,
      error: 'Failed to get favorites'
    });
  }
});

// Add recipe to favorites
router.post('/favorites/:recipeId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { recipeId } = req.params;

    // Check if already favorited
    const existing = await db
      .select()
      .from(recipeFavorites)
      .where(and(
        eq(recipeFavorites.userId, req.user.id),
        eq(recipeFavorites.recipeId, recipeId)
      ))
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipe already in favorites'
      });
    }

    // Add to favorites
    await db.insert(recipeFavorites).values({
      userId: req.user.id,
      recipeId
    });

    res.json({
      success: true,
      message: 'Recipe added to favorites'
    });
  } catch (error) {
    recipeLogger.error({ error, recipeId: req.params.recipeId }, 'Failed to add favorite');
    res.status(500).json({
      success: false,
      error: 'Failed to add favorite'
    });
  }
});

// Remove from favorites
router.delete('/favorites/:recipeId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { recipeId } = req.params;

    await db
      .delete(recipeFavorites)
      .where(and(
        eq(recipeFavorites.userId, req.user.id),
        eq(recipeFavorites.recipeId, recipeId)
      ));

    res.json({
      success: true,
      message: 'Recipe removed from favorites'
    });
  } catch (error) {
    recipeLogger.error({ error, recipeId: req.params.recipeId }, 'Failed to remove favorite');
    res.status(500).json({
      success: false,
      error: 'Failed to remove favorite'
    });
  }
});

export default router;