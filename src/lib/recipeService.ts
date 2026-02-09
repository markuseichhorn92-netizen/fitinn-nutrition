/**
 * Recipe Service - Client-side wrapper for Spoonacular API
 * Uses Next.js API route to keep API key secure
 */

import { Recipe } from '@/types';

// Local cache for client
const clientCache = new Map<string, Recipe[]>();

interface SpoonacularNutrient {
  name: string;
  amount: number;
  unit: string;
}

interface SpoonacularIngredient {
  id: number;
  name: string;
  amount: number;
  unit: string;
  aisle: string;
}

interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  servings: number;
  readyInMinutes: number;
  preparationMinutes?: number;
  cookingMinutes?: number;
  instructions?: string;
  analyzedInstructions?: Array<{
    steps: Array<{ number: number; step: string }>;
  }>;
  extendedIngredients?: SpoonacularIngredient[];
  nutrition?: { nutrients: SpoonacularNutrient[] };
  dishTypes?: string[];
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
}

// Map dish types to our categories
function mapToCategory(dishTypes: string[] = [], title: string = ''): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const types = dishTypes.map(t => t.toLowerCase());
  const titleLower = title.toLowerCase();
  
  if (types.includes('breakfast') || titleLower.includes('breakfast') || 
      titleLower.includes('pancake') || titleLower.includes('oatmeal') ||
      titleLower.includes('eggs') || titleLower.includes('smoothie')) {
    return 'breakfast';
  }
  if (types.includes('snack') || types.includes('appetizer') || 
      titleLower.includes('snack') || titleLower.includes('bar')) {
    return 'snack';
  }
  if (types.includes('lunch') || types.includes('salad') || 
      types.includes('soup') || types.includes('sandwich')) {
    return 'lunch';
  }
  return 'dinner';
}

// Extract nutrition
function extractNutrition(nutrients: SpoonacularNutrient[] = []) {
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

// Translate units to German
const unitTranslations: Record<string, string> = {
  'tablespoon': 'EL',
  'tablespoons': 'EL',
  'Tbsp': 'EL',
  'Tbsps': 'EL',
  'tbsp': 'EL',
  'teaspoon': 'TL',
  'teaspoons': 'TL',
  'tsp': 'TL',
  'Tsp': 'TL',
  'cup': 'Tasse',
  'cups': 'Tassen',
  'ounce': 'oz',
  'ounces': 'oz',
  'oz': 'oz',
  'pound': 'Pfund',
  'pounds': 'Pfund',
  'lb': 'Pfund',
  'lbs': 'Pfund',
  'gram': 'g',
  'grams': 'g',
  'g': 'g',
  'kilogram': 'kg',
  'kilograms': 'kg',
  'kg': 'kg',
  'milliliter': 'ml',
  'milliliters': 'ml',
  'ml': 'ml',
  'liter': 'l',
  'liters': 'l',
  'l': 'l',
  'pinch': 'Prise',
  'pinches': 'Prisen',
  'clove': 'Zehe',
  'cloves': 'Zehen',
  'slice': 'Scheibe',
  'slices': 'Scheiben',
  'piece': 'Stück',
  'pieces': 'Stück',
  'serving': 'Portion',
  'servings': 'Portionen',
  'small': 'klein',
  'medium': 'mittel',
  'large': 'groß',
  'bunch': 'Bund',
  'can': 'Dose',
  'cans': 'Dosen',
  'package': 'Packung',
  'packages': 'Packungen',
  'bag': 'Beutel',
  'bags': 'Beutel',
  'head': 'Kopf',
  'heads': 'Köpfe',
  'stalk': 'Stange',
  'stalks': 'Stangen',
  'sprig': 'Zweig',
  'sprigs': 'Zweige',
  'handful': 'Handvoll',
  'handfuls': 'Handvoll',
  'dash': 'Spritzer',
  'dashes': 'Spritzer',
  'drop': 'Tropfen',
  'drops': 'Tropfen',
  '': 'Stück',
};

function translateUnit(unit: string): string {
  if (!unit) return 'Stück';
  const lower = unit.toLowerCase().trim();
  return unitTranslations[lower] || unitTranslations[unit] || unit;
}

// Convert API response to our Recipe format
function convertRecipe(spoon: SpoonacularRecipe, forceCategory?: 'breakfast' | 'lunch' | 'dinner' | 'snack'): Recipe {
  const dietaryFlags: string[] = [];
  if (spoon.vegetarian) dietaryFlags.push('vegetarian');
  if (spoon.vegan) dietaryFlags.push('vegan');
  if (spoon.glutenFree) dietaryFlags.push('gluten-free');
  if (spoon.dairyFree) dietaryFlags.push('dairy-free');

  const instructions = spoon.analyzedInstructions?.[0]?.steps?.map(s => s.step) || 
    (spoon.instructions ? [spoon.instructions] : ['Siehe Originalrezept']);

  const tags = [...(spoon.dishTypes || [])];
  if (spoon.vegetarian) tags.push('vegetarisch');
  if (spoon.vegan) tags.push('vegan');

  return {
    id: `spoon-${spoon.id}`,
    name: spoon.title,
    image: spoon.image || `https://img.spoonacular.com/recipes/${spoon.id}-636x393.jpg`,
    category: forceCategory || mapToCategory(spoon.dishTypes, spoon.title),
    tags,
    servings: spoon.servings || 2,
    prepTime: spoon.preparationMinutes || Math.floor((spoon.readyInMinutes || 30) * 0.3),
    cookTime: spoon.cookingMinutes || Math.floor((spoon.readyInMinutes || 30) * 0.7),
    totalTime: spoon.readyInMinutes || 30,
    difficulty: (spoon.readyInMinutes && spoon.readyInMinutes > 45 ? 'medium' : 'easy') as 'easy' | 'medium' | 'hard',
    ingredients: (spoon.extendedIngredients || []).map(ing => ({
      name: ing.name,
      amount: ing.amount,
      unit: translateUnit(ing.unit),
      category: ing.aisle || 'Sonstiges',
    })),
    instructions,
    nutrition: extractNutrition(spoon.nutrition?.nutrients),
    allergens: [],
    dietaryFlags,
    mealPrepable: (spoon.readyInMinutes || 30) <= 45,
    storageDays: 3,
  };
}

// Get random recipes by category
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
    lunch: 'main course,salad,soup',
    dinner: 'main course',
    snack: 'snack,appetizer',
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
    const recipes = (data.recipes || []).map((r: SpoonacularRecipe) => 
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
    return (data.results || []).map((r: SpoonacularRecipe) => convertRecipe(r));
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
      id: id.startsWith('spoon-') ? id.slice(6) : id,
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
    getRecipesByCategory('breakfast', 15, diet),
    getRecipesByCategory('lunch', 15, diet),
    getRecipesByCategory('dinner', 15, diet),
    getRecipesByCategory('snack', 15, diet),
  ]);

  return { breakfast, lunch, dinner, snack };
}

// Clear client cache
export function clearCache(): void {
  clientCache.clear();
}
