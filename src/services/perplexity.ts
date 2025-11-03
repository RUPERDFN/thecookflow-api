import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { MenuPreferences } from '../types/menu.js';

const perplexityLogger = logger.child({ module: 'perplexity' });

// Check if Perplexity is available
export function isPerplexityAvailable(): boolean {
  return !!env.PERPLEXITY_API_KEY;
}

// Make a request to Perplexity API
async function perplexityRequest(prompt: string, systemPrompt?: string): Promise<any> {
  if (!env.PERPLEXITY_API_KEY) {
    throw new Error('Perplexity API not configured');
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-medium-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt || 'Eres un chef experto español. Responde siempre en español y en formato JSON cuando se solicite.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        return_citations: true,
        return_images: false
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    perplexityLogger.error({ error }, 'Perplexity API request failed');
    throw error;
  }
}

// Generate menu plan with Perplexity as fallback
export async function generateMenuPlanWithPerplexity(
  preferences: MenuPreferences
): Promise<any> {
  try {
    const prompt = `
Genera un menú semanal saludable para ${preferences.servings} personas con presupuesto de ${preferences.budget}€.

Requisitos:
- Dieta: ${preferences.diet || 'omnívora'}
- Tiempo disponible: ${preferences.cookingTime || 'normal'}
- Nivel culinario: ${preferences.skillLevel || 'intermedio'}
- Evitar: ${preferences.allergies?.join(', ') || 'nada'}
- Ingredientes disponibles: ${preferences.availableIngredients?.join(', ') || 'ninguno'}

Devuelve un JSON con recetas para 7 días (desayuno, almuerzo, cena, snack) incluyendo:
- nombre, ingredientes con cantidades, instrucciones, tiempo de cocción, información nutricional

Estructura JSON requerida:
{
  "menuPlan": {
    "name": "Menú Semanal",
    "recipes": [{
      "dayOfWeek": 0-6,
      "mealType": "breakfast|lunch|dinner|snack",
      "name": "nombre",
      "ingredients": [{"name": "", "amount": "", "unit": ""}],
      "instructions": [""],
      "cookingTime": minutos,
      "nutritionInfo": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
    }],
    "totalCost": coste_estimado
  }
}
`;

    const result = await perplexityRequest(prompt);
    const menuData = JSON.parse(result);
    
    perplexityLogger.info({ preferences }, 'Menu generated with Perplexity');
    return menuData.menuPlan;
  } catch (error) {
    perplexityLogger.error({ error, preferences }, 'Failed to generate menu with Perplexity');
    throw error;
  }
}

// Ask Perplexity for general culinary questions
export async function askPerplexity(question: string): Promise<string> {
  try {
    const result = await perplexityRequest(
      question,
      'Eres un experto en cocina y nutrición. Proporciona respuestas detalladas y útiles en español.'
    );
    
    perplexityLogger.info({ question }, 'Perplexity query completed');
    return result;
  } catch (error) {
    perplexityLogger.error({ error, question }, 'Perplexity query failed');
    throw error;
  }
}

// Enhance menu with current food trends
export async function enhanceMenuWithTrends(menu: any): Promise<any> {
  try {
    const prompt = `
Analiza este menú y sugiere mejoras basadas en tendencias actuales de alimentación saludable:
${JSON.stringify(menu, null, 2)}

Proporciona sugerencias para:
1. Hacer los platos más nutritivos
2. Incorporar superalimentos de moda
3. Adaptar a dietas populares (keto, paleo, etc.)
4. Reducir costes sin perder calidad

Devuelve las sugerencias en formato JSON estructurado.
`;

    const result = await perplexityRequest(prompt);
    const enhancements = JSON.parse(result);
    
    perplexityLogger.info('Menu enhanced with trends');
    return { ...menu, enhancements };
  } catch (error) {
    perplexityLogger.error({ error }, 'Failed to enhance menu with trends');
    return menu; // Return original menu if enhancement fails
  }
}

// Recognize ingredients with Perplexity (text-based)
export async function recognizeIngredientsWithPerplexity(
  description: string
): Promise<any> {
  try {
    const prompt = `
Basándote en esta descripción de ingredientes: "${description}"

Identifica y lista todos los ingredientes mencionados con:
- Nombre del ingrediente
- Cantidad estimada si se menciona
- Categoría (verdura, fruta, carne, etc.)
- Estado de frescura si es relevante

Devuelve un JSON:
{
  "ingredients": [
    {
      "name": "nombre",
      "quantity": "cantidad",
      "category": "categoría",
      "notes": "notas adicionales"
    }
  ],
  "recipeSuggestions": ["receta1", "receta2"]
}
`;

    const result = await perplexityRequest(prompt);
    const data = JSON.parse(result);
    
    perplexityLogger.info({ description }, 'Ingredients recognized with Perplexity');
    return data;
  } catch (error) {
    perplexityLogger.error({ error, description }, 'Failed to recognize ingredients');
    throw error;
  }
}

// Calculate API cost for Perplexity
export function calculatePerplexityCost(requestCount: number): number {
  // Perplexity pricing: $5 per 1000 requests for Sonar Medium
  const costPerRequest = 5 / 1000;
  return requestCount * costPerRequest;
}