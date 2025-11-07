import { db } from '../config/database.js';
import { recipeLibrary } from '@thecookflow/shared/schemas';
import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import type { MenuPreferences, Recipe, ShoppingItem } from '../types/menu.js';
import { logger } from '../utils/logger.js';

const offlineLogger = logger.child({ module: 'offline-menu' });

// Offline menu generation using recipe library
export async function generateOfflineMenu(preferences: MenuPreferences): Promise<any> {
  const budget = preferences.budget || 50;
  const servings = preferences.servings || 2;
  const diet = preferences.diet || 'omnívora';
  const cookingTime = preferences.cookingTime || 'normal';

  // Map cooking time preference to minutes
  const maxCookingTime = {
    'rápido': 30,
    'normal': 60,
    'elaborado': 120
  }[cookingTime];

  try {
    // Fetch recipes from library based on preferences
    const libraryRecipes = await db
      .select()
      .from(recipeLibrary)
      .where(and(
        eq(recipeLibrary.isApproved, true),
        lte(recipeLibrary.cookingTime, maxCookingTime)
      ))
      .limit(100);

    // Filter recipes based on dietary restrictions
    const filteredRecipes = libraryRecipes.filter(recipe => {
      if (diet === 'vegetariana' && !recipe.dietaryTags?.includes('vegetarian')) return false;
      if (diet === 'vegana' && !recipe.dietaryTags?.includes('vegan')) return false;
      if (diet === 'keto' && !recipe.dietaryTags?.includes('keto')) return false;
      if (diet === 'sin_gluten' && !recipe.dietaryTags?.includes('gluten-free')) return false;
      
      // Check for allergies
      if (preferences.allergies && preferences.allergies.length > 0) {
        const hasAllergen = preferences.allergies.some(allergy => 
          recipe.allergens?.includes(allergy.toLowerCase())
        );
        if (hasAllergen) return false;
      }
      
      return true;
    });

    // Generate a 7-day menu with 4 meals per day
    const menuRecipes: Recipe[] = [];
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
    
    for (let day = 0; day < 7; day++) {
      for (const mealType of mealTypes) {
        // Select appropriate recipe for meal type
        const mealRecipes = filteredRecipes.filter(r => r.mealType === mealType);
        if (mealRecipes.length > 0) {
          const randomRecipe = mealRecipes[Math.floor(Math.random() * mealRecipes.length)];
          
          menuRecipes.push({
            dayOfWeek: day,
            mealType,
            name: randomRecipe.name,
            description: randomRecipe.description || undefined,
            ingredients: randomRecipe.ingredients as any || [],
            instructions: randomRecipe.instructions as string[] || [],
            nutritionInfo: randomRecipe.nutritionInfo as any || undefined,
            cookingTime: randomRecipe.cookingTime,
            servings: randomRecipe.servings,
            estimatedCost: randomRecipe.estimatedCost || undefined
          });
        }
      }
    }

    // Generate shopping list from all recipes
    const shoppingList = generateShoppingList(menuRecipes, servings);

    offlineLogger.info({ 
      preferences, 
      recipeCount: menuRecipes.length 
    }, 'Offline menu generated');

    return {
      name: `Menú Semanal - ${new Date().toLocaleDateString('es-ES')}`,
      weekStartDate: new Date().toISOString(),
      preferences,
      recipes: menuRecipes,
      shoppingList: {
        items: shoppingList,
        totalEstimatedCost: calculateTotalCost(shoppingList)
      }
    };
  } catch (error) {
    offlineLogger.error({ error }, 'Failed to generate offline menu');
    
    // Return a basic fallback menu
    return generateFallbackMenu(preferences);
  }
}

// Generate shopping list from recipes
function generateShoppingList(recipes: Recipe[], servings: number): ShoppingItem[] {
  const ingredients = new Map<string, ShoppingItem>();

  recipes.forEach(recipe => {
    recipe.ingredients.forEach(ingredient => {
      const key = ingredient.name.toLowerCase();
      
      if (ingredients.has(key)) {
        // Aggregate quantities
        const existing = ingredients.get(key)!;
        const currentAmount = parseFloat(existing.quantity) || 0;
        const newAmount = parseFloat(ingredient.amount) || 0;
        existing.quantity = (currentAmount + newAmount).toString();
      } else {
        ingredients.set(key, {
          name: ingredient.name,
          quantity: ingredient.amount,
          unit: ingredient.unit,
          category: ingredient.category,
          estimatedPrice: estimatePrice(ingredient.name, ingredient.amount)
        });
      }
    });
  });

  return Array.from(ingredients.values());
}

// Calculate total cost of shopping list
function calculateTotalCost(items: ShoppingItem[]): number {
  return items.reduce((total, item) => total + (item.estimatedPrice || 0), 0);
}

// Estimate price for an ingredient
function estimatePrice(ingredient: string, amount: string): number {
  // Simple price estimation based on common Spanish grocery prices
  const pricePerKg: Record<string, number> = {
    'pollo': 5.50,
    'ternera': 12.00,
    'pescado': 8.00,
    'arroz': 1.50,
    'pasta': 2.50,
    'patatas': 1.20,
    'tomate': 2.80,
    'cebolla': 1.50,
    'leche': 1.20,
    'huevos': 2.50,
    'pan': 2.00,
    'aceite': 4.50
  };

  const basePrice = pricePerKg[ingredient.toLowerCase()] || 3.00;
  const quantity = parseFloat(amount) || 0.5;
  
  return Math.round(basePrice * quantity * 100) / 100;
}

// Generate a basic fallback menu when all else fails
function generateFallbackMenu(preferences: MenuPreferences): any {
  const basicRecipes: Recipe[] = [
    // Monday
    {
      dayOfWeek: 0,
      mealType: 'breakfast',
      name: 'Tostadas con Tomate y Aceite',
      ingredients: [
        { name: 'Pan', amount: '2', unit: 'rebanadas', category: 'Panadería' },
        { name: 'Tomate', amount: '1', unit: 'unidad', category: 'Verduras' },
        { name: 'Aceite de oliva', amount: '20', unit: 'ml', category: 'Aceites' }
      ],
      instructions: ['Tostar el pan', 'Rallar el tomate', 'Añadir aceite y sal'],
      cookingTime: 10,
      servings: preferences.servings || 2
    },
    {
      dayOfWeek: 0,
      mealType: 'lunch',
      name: 'Paella de Verduras',
      ingredients: [
        { name: 'Arroz', amount: '200', unit: 'g', category: 'Cereales' },
        { name: 'Pimiento', amount: '1', unit: 'unidad', category: 'Verduras' },
        { name: 'Judías verdes', amount: '100', unit: 'g', category: 'Verduras' }
      ],
      instructions: ['Sofreír verduras', 'Añadir arroz y caldo', 'Cocinar 20 minutos'],
      cookingTime: 35,
      servings: preferences.servings || 2
    }
    // Add more basic recipes for the week...
  ];

  return {
    name: 'Menú Básico Semanal',
    weekStartDate: new Date().toISOString(),
    preferences,
    recipes: basicRecipes,
    shoppingList: {
      items: generateShoppingList(basicRecipes, preferences.servings || 2),
      totalEstimatedCost: 45
    }
  };
}