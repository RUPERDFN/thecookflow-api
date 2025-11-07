import OpenAI from 'openai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { MenuPreferences } from '../types/menu.js';

const aiLogger = logger.child({ module: 'openai' });

// Initialize OpenAI client
const openai = env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    })
  : null;

// Check if OpenAI is available
export function isOpenAIAvailable(): boolean {
  return !!openai;
}

// Generate weekly menu plan using GPT-4
export async function generateWeeklyMenuPlan(preferences: MenuPreferences): Promise<any> {
  if (!openai) {
    throw new Error('OpenAI API not configured');
  }

  try {
    const prompt = `
Genera un menú semanal completo en español para ${preferences.servings} personas con un presupuesto de ${preferences.budget}€.

Preferencias:
- Dieta: ${preferences.diet || 'omnívora'}
- Tiempo de cocina: ${preferences.cookingTime || 'normal'}
- Nivel de habilidad: ${preferences.skillLevel || 'intermedio'}
- Alergias: ${preferences.allergies?.join(', ') || 'ninguna'}
- Ingredientes disponibles: ${preferences.availableIngredients?.join(', ') || 'ninguno especificado'}
- Platos favoritos: ${preferences.favorites?.join(', ') || 'ninguno especificado'}
- No le gusta: ${preferences.dislikes?.join(', ') || 'ninguno'}

Genera un JSON con la siguiente estructura exacta:
{
  "menuPlan": {
    "name": "Menú Semana del [fecha]",
    "weekStartDate": "[fecha ISO]",
    "preferences": ${JSON.stringify(preferences)},
    "recipes": [
      {
        "dayOfWeek": 0-6,
        "mealType": "breakfast|lunch|dinner|snack",
        "name": "Nombre del plato",
        "description": "Descripción breve",
        "ingredients": [
          {
            "name": "ingrediente",
            "amount": "cantidad",
            "unit": "unidad",
            "category": "categoría"
          }
        ],
        "instructions": ["paso 1", "paso 2"],
        "nutritionInfo": {
          "calories": número,
          "protein": número,
          "carbs": número,
          "fat": número
        },
        "cookingTime": minutos,
        "servings": ${preferences.servings}
      }
    ],
    "shoppingList": {
      "items": [
        {
          "name": "ingrediente",
          "quantity": "cantidad total",
          "unit": "unidad",
          "category": "categoría",
          "estimatedPrice": precio
        }
      ],
      "totalEstimatedCost": coste total
    }
  }
}

IMPORTANTE: 
- Incluye 4 comidas por día (desayuno, almuerzo, cena, snack)
- Varía los platos para no repetir
- Ajusta las cantidades al número de personas
- Respeta el presupuesto máximo
- Usa ingredientes de temporada españoles
- Proporciona instrucciones claras y concisas
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Eres un chef experto español especializado en planificación de menús saludables y económicos. Respondes siempre en JSON válido.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
      max_tokens: 4000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    aiLogger.info({ 
      preferences,
      tokensUsed: response.usage?.total_tokens 
    }, 'Menu generated successfully');

    return result.menuPlan;
  } catch (error) {
    aiLogger.error({ error, preferences }, 'Failed to generate menu with OpenAI');
    throw error;
  }
}

// Generate recipe suggestions based on available ingredients
export async function generateRecipeSuggestions(ingredients: string[]): Promise<any[]> {
  if (!openai) {
    throw new Error('OpenAI API not configured');
  }

  try {
    const prompt = `
Con estos ingredientes disponibles: ${ingredients.join(', ')}

Sugiere 3 recetas españolas que se puedan hacer. Para cada receta proporciona:
- Nombre del plato
- Ingredientes necesarios (indicando cuáles ya están disponibles)
- Tiempo de preparación
- Dificultad (fácil/medio/difícil)
- Instrucciones breves

Responde en formato JSON con esta estructura:
{
  "recipes": [
    {
      "name": "nombre",
      "availableIngredients": ["ingrediente1"],
      "missingIngredients": ["ingrediente2"],
      "cookingTime": minutos,
      "difficulty": "fácil|medio|difícil",
      "instructions": ["paso 1", "paso 2"]
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Eres un chef español experto. Sugiere recetas prácticas usando los ingredientes disponibles.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' },
      max_tokens: 1500
    });

    const result = JSON.parse(response.choices[0].message.content || '{"recipes": []}');
    return result.recipes;
  } catch (error) {
    aiLogger.error({ error, ingredients }, 'Failed to generate recipe suggestions');
    throw error;
  }
}

// Recognize food from image using GPT-4 Vision
export async function recognizeFoodFromImage(imageUrl: string): Promise<any> {
  if (!openai) {
    throw new Error('OpenAI API not configured');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en reconocimiento de alimentos. Identifica todos los ingredientes visibles en la imagen y estima sus cantidades.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza esta imagen y devuelve un JSON con:
{
  "recognizedItems": [
    {
      "name": "nombre del alimento",
      "confidence": 0.0-1.0,
      "category": "fruta|verdura|carne|pescado|lácteo|cereal|procesado|otro",
      "quantity": "cantidad estimada",
      "freshness": "fresco|normal|maduro|pasado"
    }
  ],
  "suggestedRecipes": [
    {
      "name": "nombre de receta sugerida",
      "relevanceScore": 0.0-1.0,
      "matchedIngredients": ["ingrediente1", "ingrediente2"]
    }
  ]
}`
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    aiLogger.info({ 
      itemCount: result.recognizedItems?.length,
      tokensUsed: response.usage?.total_tokens 
    }, 'Food recognized from image');

    return result;
  } catch (error) {
    aiLogger.error({ error }, 'Failed to recognize food from image');
    throw error;
  }
}

// Complete a partial menu prompt
export async function completeMenuPrompt(
  partialPrompt: string,
  context: string
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API not configured');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: context || 'Eres un asistente culinario experto en cocina española.'
        },
        { role: 'user', content: partialPrompt }
      ],
      temperature: 0.5,
      max_tokens: 500
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    aiLogger.error({ error }, 'Failed to complete prompt');
    throw error;
  }
}

// Calculate token usage and cost
export function calculateTokenCost(tokens: number, model = 'gpt-3.5-turbo'): number {
  const costs: Record<string, number> = {
    'gpt-3.5-turbo': 0.002 / 1000, // $0.002 per 1K tokens
    'gpt-4': 0.03 / 1000, // $0.03 per 1K tokens  
    'gpt-4o': 0.005 / 1000, // $0.005 per 1K tokens
    'gpt-4o-mini': 0.00015 / 1000 // $0.00015 per 1K tokens
  };

  return tokens * (costs[model] || costs['gpt-3.5-turbo']);
}