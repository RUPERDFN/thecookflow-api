// Menu preferences for AI generation
export interface MenuPreferences {
  servings: number;
  budget: number;
  diet?: 'omnívora' | 'vegetariana' | 'vegana' | 'keto' | 'sin_gluten';
  cookingTime?: 'rápido' | 'normal' | 'elaborado';
  skillLevel?: 'principiante' | 'intermedio' | 'avanzado';
  allergies?: string[];
  availableIngredients?: string[];
  favorites?: string[];
  dislikes?: string[];
  mealsPerDay?: number;
  weekDays?: number;
}

// Recipe structure
export interface Recipe {
  dayOfWeek: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'midmorning';
  name: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: string[];
  nutritionInfo?: NutritionInfo;
  cookingTime: number;
  servings: number;
  imageUrl?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedCost?: number;
}

// Ingredient structure
export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  category: string;
}

// Nutrition information
export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
}

// Shopping list item
export interface ShoppingItem {
  name: string;
  quantity: string;
  unit: string;
  category: string;
  estimatedPrice?: number;
  checked?: boolean;
  store?: string;
}

// Menu plan response
export interface MenuPlanResponse {
  menuPlan: {
    id?: string;
    name: string;
    weekStartDate: string;
    preferences: MenuPreferences;
    recipes: Recipe[];
    shoppingList?: {
      items: ShoppingItem[];
      totalEstimatedCost: number;
    };
  };
  generationMethod?: 'openai' | 'perplexity' | 'offline';
  tokensUsed?: number;
  cost?: number;
}

// Food recognition result
export interface FoodRecognitionResult {
  recognizedItems: Array<{
    name: string;
    confidence: number;
    category: string;
    quantity?: string;
    freshness?: string;
  }>;
  suggestedRecipes?: Array<{
    name: string;
    relevanceScore: number;
    matchedIngredients: string[];
    missingIngredients?: string[];
  }>;
  imageUrl: string;
}