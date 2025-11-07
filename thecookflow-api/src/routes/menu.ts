import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/database.js';
import { 
  menuPlans, 
  recipes, 
  shoppingLists,
  menuGenerationLimits 
} from '@thecookflow/shared/schemas';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import { 
  generateWeeklyMenuPlan, 
  generateRecipeSuggestions,
  isOpenAIAvailable 
} from '../services/openai.js';
import { 
  generateMenuPlanWithPerplexity,
  isPerplexityAvailable
} from '../services/perplexity.js';
import { generateOfflineMenu } from '../services/offlineMenu.js';
import { logger } from '../utils/logger.js';
import type { MenuPreferences } from '../types/menu.js';

const router = Router();
const menuLogger = logger.child({ module: 'menu-routes' });

// Menu generation request schema
const menuRequestSchema = z.object({
  servings: z.number().int().min(1).max(12),
  budget: z.number().positive(),
  diet: z.enum(['omnívora', 'vegetariana', 'vegana', 'keto', 'sin_gluten']).optional(),
  cookingTime: z.enum(['rápido', 'normal', 'elaborado']).optional(),
  skillLevel: z.enum(['principiante', 'intermedio', 'avanzado']).optional(),
  allergies: z.array(z.string()).optional(),
  availableIngredients: z.array(z.string()).optional(),
  favorites: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional()
});

// Check daily generation limit
async function checkGenerationLimit(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  
  const [limit] = await db
    .select()
    .from(menuGenerationLimits)
    .where(and(
      eq(menuGenerationLimits.userId, userId),
      eq(menuGenerationLimits.date, today)
    ))
    .limit(1);

  if (!limit) {
    // Create new limit record
    await db.insert(menuGenerationLimits).values({
      userId,
      date: today,
      generationCount: 0
    });
    return true;
  }

  // Check if within free tier limit (1 per day for free users)
  return limit.generationCount < 1;
}

// Update generation count
async function incrementGenerationCount(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  await db
    .update(menuGenerationLimits)
    .set({ 
      generationCount: db.sql`generation_count + 1`,
      updatedAt: new Date()
    })
    .where(and(
      eq(menuGenerationLimits.userId, userId),
      eq(menuGenerationLimits.date, today)
    ));
}

// Generate menu endpoint
router.post('/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const preferences = menuRequestSchema.parse(req.body) as MenuPreferences;

    // Check generation limit for free users
    if (!req.user.isPremium) {
      const canGenerate = await checkGenerationLimit(req.user.id);
      if (!canGenerate) {
        return res.status(403).json({
          success: false,
          error: 'Daily menu generation limit reached',
          code: 'LIMIT_EXCEEDED'
        });
      }
    }

    let menuData;
    let generationMethod: 'openai' | 'perplexity' | 'offline' = 'offline';

    // Try OpenAI first
    if (isOpenAIAvailable()) {
      try {
        menuData = await generateWeeklyMenuPlan(preferences);
        generationMethod = 'openai';
        menuLogger.info({ userId: req.user.id, method: 'openai' }, 'Menu generated with OpenAI');
      } catch (openaiError) {
        menuLogger.warn({ error: openaiError }, 'OpenAI generation failed, trying Perplexity');
      }
    }

    // Fallback to Perplexity
    if (!menuData && isPerplexityAvailable()) {
      try {
        menuData = await generateMenuPlanWithPerplexity(preferences);
        generationMethod = 'perplexity';
        menuLogger.info({ userId: req.user.id, method: 'perplexity' }, 'Menu generated with Perplexity');
      } catch (perplexityError) {
        menuLogger.warn({ error: perplexityError }, 'Perplexity generation failed, using offline');
      }
    }

    // Final fallback to offline generation
    if (!menuData) {
      menuData = await generateOfflineMenu(preferences);
      generationMethod = 'offline';
      menuLogger.info({ userId: req.user.id, method: 'offline' }, 'Menu generated offline');
    }

    // Save menu plan to database
    const [savedMenu] = await db
      .insert(menuPlans)
      .values({
        userId: req.user.id,
        name: menuData.name || `Menú Semana ${new Date().toLocaleDateString('es-ES')}`,
        weekStartDate: new Date(menuData.weekStartDate || new Date()),
        preferences: preferences as any
      })
      .returning();

    // Save recipes
    if (menuData.recipes && menuData.recipes.length > 0) {
      await db.insert(recipes).values(
        menuData.recipes.map((recipe: any) => ({
          menuPlanId: savedMenu.id,
          ...recipe
        }))
      );
    }

    // Save shopping list
    if (menuData.shoppingList) {
      await db.insert(shoppingLists).values({
        menuPlanId: savedMenu.id,
        items: menuData.shoppingList.items,
        totalEstimatedCost: menuData.shoppingList.totalEstimatedCost
      });
    }

    // Update generation count for free users
    if (!req.user.isPremium) {
      await incrementGenerationCount(req.user.id);
    }

    res.json({
      success: true,
      data: {
        menuPlan: {
          ...savedMenu,
          ...menuData
        },
        generationMethod
      }
    });
  } catch (error) {
    menuLogger.error({ error, userId: req.user?.id }, 'Menu generation failed');
    res.status(500).json({
      success: false,
      error: 'Failed to generate menu'
    });
  }
});

// Get user's menu plans
router.get('/my-menus', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userMenus = await db
      .select()
      .from(menuPlans)
      .where(eq(menuPlans.userId, req.user.id))
      .orderBy(desc(menuPlans.createdAt))
      .limit(20);

    res.json({
      success: true,
      data: userMenus
    });
  } catch (error) {
    menuLogger.error({ error, userId: req.user?.id }, 'Failed to get user menus');
    res.status(500).json({
      success: false,
      error: 'Failed to get menus'
    });
  }
});

// Get specific menu plan with recipes
router.get('/:menuId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { menuId } = req.params;

    // Get menu plan
    const [menu] = await db
      .select()
      .from(menuPlans)
      .where(and(
        eq(menuPlans.id, menuId),
        eq(menuPlans.userId, req.user.id)
      ))
      .limit(1);

    if (!menu) {
      return res.status(404).json({
        success: false,
        error: 'Menu not found'
      });
    }

    // Get recipes
    const menuRecipes = await db
      .select()
      .from(recipes)
      .where(eq(recipes.menuPlanId, menuId));

    // Get shopping list
    const [shoppingList] = await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.menuPlanId, menuId))
      .limit(1);

    res.json({
      success: true,
      data: {
        ...menu,
        recipes: menuRecipes,
        shoppingList
      }
    });
  } catch (error) {
    menuLogger.error({ error, menuId: req.params.menuId }, 'Failed to get menu details');
    res.status(500).json({
      success: false,
      error: 'Failed to get menu details'
    });
  }
});

// Delete menu plan
router.delete('/:menuId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { menuId } = req.params;

    // Delete menu (cascade will delete recipes and shopping list)
    await db
      .delete(menuPlans)
      .where(and(
        eq(menuPlans.id, menuId),
        eq(menuPlans.userId, req.user.id)
      ));

    res.json({
      success: true,
      message: 'Menu deleted successfully'
    });
  } catch (error) {
    menuLogger.error({ error, menuId: req.params.menuId }, 'Failed to delete menu');
    res.status(500).json({
      success: false,
      error: 'Failed to delete menu'
    });
  }
});

export default router;