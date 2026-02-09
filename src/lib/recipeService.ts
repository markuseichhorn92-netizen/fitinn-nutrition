/**
 * Recipe Service - Lädt lokale deutsche Rezepte
 * Keine externe API mehr - nur eigene Rezepte aus recipes.json
 */

import { Recipe } from '@/types';

// Local cache for client
const clientCache = new Map<string, Recipe[]>();

interface ApiRecipe {
  id: number;
  title: string;
  image: string;
  servings: number;
  readyInMinutes: number;
  preparationMinutes?: number;
  cookingMinutes?: number;
  extendedIngredients?: Array<{
    id: number;
    name: string;
    amount: number;
    unit: string;
    aisle: string;
  }>;
  analyzedInstructions?: Array<{
    steps: Array<{ number: number; step: string }>;
  }>;
  nutrition?: {
    nutrients: Array<{ name: string; amount: number; unit: string }>;
  };
  dishTypes?: string[];
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
}

// Map dish types to our categories
function mapToCategory(dishTypes: string[] = []): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const types = dishTypes.map(t => t.toLowerCase());
  if (types.includes('breakfast')) return 'breakfast';
  if (types.includes('snack')) return 'snack';
  if (types.includes('lunch')) return 'lunch';
  if (types.includes('dinner')) return 'dinner';
  return 'lunch';
}

// Extract nutrition
function extractNutrition(nutrients: Array<{ name: string; amount: number }> = []) {
  const find = (name: string) => 
    nutrients.find(n => n.name.toLowerCase() === name.toLowerCase())?.amount || 0;
  return {
    calories: Math.round(find('Calories')),
    protein: Math.round(find('Protein')),
    carbs: Math.round(find('Carbohydrates')),
    fat: Math.round(find('Fat')),
    fiber: Math.round(find('Fiber')),
  };
}

// Convert API response to our Recipe format
function convertRecipe(apiRecipe: ApiRecipe, forceCategory?: 'breakfast' | 'lunch' | 'dinner' | 'snack'): Recipe {
  const dietaryFlags: string[] = [];
  if (apiRecipe.vegetarian) dietaryFlags.push('vegetarian');
  if (apiRecipe.vegan) dietaryFlags.push('vegan');
  if (apiRecipe.glutenFree) dietaryFlags.push('gluten-free');
  if (apiRecipe.dairyFree) dietaryFlags.push('dairy-free');

  const instructions = apiRecipe.analyzedInstructions?.[0]?.steps?.map(s => s.step) || 
    ['Siehe Rezeptdetails'];

  const tags = [...(apiRecipe.dishTypes || [])];
  if (apiRecipe.vegetarian) tags.push('vegetarisch');
  if (apiRecipe.vegan) tags.push('vegan');

  return {
    id: `recipe-${String(apiRecipe.id).padStart(3, '0')}`,
    name: apiRecipe.title,
    image: apiRecipe.image || '/images/placeholder.jpg',
    category: forceCategory || mapToCategory(apiRecipe.dishTypes),
    tags,
    servings: apiRecipe.servings || 2,
    prepTime: apiRecipe.preparationMinutes || Math.floor((apiRecipe.readyInMinutes || 30) * 0.3),
    cookTime: apiRecipe.cookingMinutes || Math.floor((apiRecipe.readyInMinutes || 30) * 0.7),
    totalTime: apiRecipe.readyInMinutes || 30,
    difficulty: (apiRecipe.readyInMinutes && apiRecipe.readyInMinutes > 45 ? 'medium' : 'easy') as 'easy' | 'medium' | 'hard',
    ingredients: (apiRecipe.extendedIngredients || []).map(ing => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit || 'Stück',
      category: ing.aisle || 'Sonstiges',
    })),
    instructions,
    nutrition: extractNutrition(apiRecipe.nutrition?.nutrients),
    allergens: [],
    dietaryFlags,
    mealPrepable: (apiRecipe.readyInMinutes || 30) <= 45,
    storageDays: 3,
  };
}

// Get recipes by category
export async function getRecipesByCategory(
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  count: number = 10,
  diet?: string
): Promise<Recipe[]> {
  const cacheKey = `${category}-${count}-${diet || 'any'}`;
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }

  const typeMap: Record<string, string> = {
    breakfast: 'breakfast',
    lunch: 'lunch',
    dinner: 'dinner',
    snack: 'snack',
  };

  try {
    const params = new URLSearchParams({
      action: 'random',
      type: typeMap[category] || category,
      number: String(count),
    });
    if (diet) params.append('diet', diet);

    const res = await fetch(`/api/recipes?${params}`);
    if (!res.ok) throw new Error('API error');
    
    const data = await res.json();
    const recipes = (data.recipes || []).map((r: ApiRecipe) => 
      convertRecipe(r, category)
    );
    
    clientCache.set(cacheKey, recipes);
    return recipes;
  } catch (error) {
    console.error('Failed to fetch recipes:', error);
    return [];
  }
}

// Search recipes
export async function searchRecipes(query: string, options: {
  type?: string;
  diet?: string;
  number?: number;
} = {}): Promise<Recipe[]> {
  try {
    const params = new URLSearchParams({
      action: 'search',
      query,
      number: String(options.number || 10),
    });
    if (options.type) params.append('type', options.type);
    if (options.diet) params.append('diet', options.diet);

    const res = await fetch(`/api/recipes?${params}`);
    if (!res.ok) throw new Error('API error');
    
    const data = await res.json();
    return (data.results || []).map((r: ApiRecipe) => convertRecipe(r));
  } catch (error) {
    console.error('Failed to search recipes:', error);
    return [];
  }
}

// Get recipe by ID
export async function getRecipeById(id: string): Promise<Recipe | null> {
  try {
    const params = new URLSearchParams({
      action: 'get',
      id: id.replace('recipe-', ''),
    });

    const res = await fetch(`/api/recipes?${params}`);
    if (!res.ok) throw new Error('API error');
    
    const data = await res.json();
    return convertRecipe(data);
  } catch (error) {
    console.error('Failed to get recipe:', error);
    return null;
  }
}

// Prefetch all categories for meal planning
export async function prefetchAllRecipes(diet?: string): Promise<{
  breakfast: Recipe[];
  lunch: Recipe[];
  dinner: Recipe[];
  snack: Recipe[];
}> {
  const [breakfast, lunch, dinner, snack] = await Promise.all([
    getRecipesByCategory('breakfast', 20, diet),
    getRecipesByCategory('lunch', 20, diet),
    getRecipesByCategory('dinner', 20, diet),
    getRecipesByCategory('snack', 20, diet),
  ]);

  return { breakfast, lunch, dinner, snack };
}

// Clear client cache
export function clearCache(): void {
  clientCache.clear();
}
