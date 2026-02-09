/**
 * Spoonacular API Service
 * https://spoonacular.com/food-api/docs
 */

import { Recipe } from '@/types';

const API_KEY = '5d497a5334804128b400da1a1898d1d4';
const BASE_URL = 'https://api.spoonacular.com';

// Cache for recipes to reduce API calls
const recipeCache = new Map<string, Recipe>();
const searchCache = new Map<string, Recipe[]>();

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
  imageType: string;
  servings: number;
  readyInMinutes: number;
  preparationMinutes?: number;
  cookingMinutes?: number;
  sourceUrl: string;
  summary: string;
  instructions?: string;
  analyzedInstructions?: Array<{
    steps: Array<{
      number: number;
      step: string;
    }>;
  }>;
  extendedIngredients?: SpoonacularIngredient[];
  nutrition?: {
    nutrients: SpoonacularNutrient[];
  };
  diets?: string[];
  dishTypes?: string[];
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
}

// Map Spoonacular dish types to our categories
function mapToCategory(dishTypes: string[] = [], title: string = ''): string {
  const types = dishTypes.map(t => t.toLowerCase());
  const titleLower = title.toLowerCase();
  
  if (types.includes('breakfast') || titleLower.includes('breakfast') || 
      titleLower.includes('pancake') || titleLower.includes('oatmeal') ||
      titleLower.includes('eggs') || titleLower.includes('smoothie')) {
    return 'breakfast';
  }
  if (types.includes('snack') || types.includes('appetizer') || 
      titleLower.includes('snack') || titleLower.includes('bar') ||
      titleLower.includes('energy') || titleLower.includes('nuts')) {
    return 'snack';
  }
  if (types.includes('lunch') || types.includes('salad') || 
      types.includes('soup') || types.includes('sandwich')) {
    return 'lunch';
  }
  if (types.includes('dinner') || types.includes('main course') || 
      types.includes('main dish')) {
    return 'dinner';
  }
  // Default based on time of day typical dishes
  return 'lunch';
}

// Extract nutrition values
function extractNutrition(nutrients: SpoonacularNutrient[] = []) {
  const find = (name: string) => nutrients.find(n => n.name.toLowerCase() === name.toLowerCase())?.amount || 0;
  return {
    calories: Math.round(find('Calories')),
    protein: Math.round(find('Protein')),
    carbs: Math.round(find('Carbohydrates')),
    fat: Math.round(find('Fat')),
    fiber: Math.round(find('Fiber')),
  };
}

// Convert Spoonacular recipe to our format
function convertRecipe(spoon: SpoonacularRecipe): Recipe {
  const dietaryFlags: string[] = [];
  if (spoon.vegetarian) dietaryFlags.push('vegetarian');
  if (spoon.vegan) dietaryFlags.push('vegan');
  if (spoon.glutenFree) dietaryFlags.push('gluten-free');
  if (spoon.dairyFree) dietaryFlags.push('dairy-free');

  // Extract steps from analyzed instructions
  const instructions = spoon.analyzedInstructions?.[0]?.steps?.map(s => s.step) || 
    (spoon.instructions ? [spoon.instructions] : ['Siehe Originalrezept']);

  // Map dish types to tags
  const tags = spoon.dishTypes || [];
  if (spoon.vegetarian) tags.push('vegetarisch');
  if (spoon.vegan) tags.push('vegan');

  const category = mapToCategory(spoon.dishTypes, spoon.title);

  return {
    id: `spoon-${spoon.id}`,
    name: spoon.title,
    image: spoon.image || `https://img.spoonacular.com/recipes/${spoon.id}-636x393.jpg`,
    category: category as 'breakfast' | 'lunch' | 'dinner' | 'snack',
    tags,
    servings: spoon.servings || 2,
    prepTime: spoon.preparationMinutes || Math.floor((spoon.readyInMinutes || 30) * 0.3),
    cookTime: spoon.cookingMinutes || Math.floor((spoon.readyInMinutes || 30) * 0.7),
    totalTime: spoon.readyInMinutes || 30,
    difficulty: (spoon.readyInMinutes && spoon.readyInMinutes > 45 ? 'medium' : 'easy') as 'easy' | 'medium' | 'hard',
    ingredients: (spoon.extendedIngredients || []).map(ing => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit || 'Stück',
      category: ing.aisle || 'Sonstiges',
    })),
    instructions,
    nutrition: extractNutrition(spoon.nutrition?.nutrients),
    allergens: [], // Would need separate API call
    dietaryFlags,
    mealPrepable: (spoon.readyInMinutes || 30) <= 45,
    storageDays: 3,
  };
}

// Search recipes
export async function searchRecipes(query: string, options: {
  diet?: string;
  type?: string;
  maxReadyTime?: number;
  number?: number;
} = {}): Promise<Recipe[]> {
  const cacheKey = JSON.stringify({ query, ...options });
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  const params = new URLSearchParams({
    apiKey: API_KEY,
    query,
    number: String(options.number || 10),
    addRecipeNutrition: 'true',
    addRecipeInstructions: 'true',
    fillIngredients: 'true',
  });

  if (options.diet) params.append('diet', options.diet);
  if (options.type) params.append('type', options.type);
  if (options.maxReadyTime) params.append('maxReadyTime', String(options.maxReadyTime));

  try {
    const res = await fetch(`${BASE_URL}/recipes/complexSearch?${params}`);
    if (!res.ok) throw new Error(`Spoonacular API error: ${res.status}`);
    
    const data = await res.json();
    const recipes = (data.results || []).map(convertRecipe);
    
    // Cache results
    searchCache.set(cacheKey, recipes);
    recipes.forEach((r: Recipe) => recipeCache.set(r.id, r));
    
    return recipes;
  } catch (error) {
    console.error('Spoonacular search error:', error);
    return [];
  }
}

// Get random recipes by type
export async function getRandomRecipes(type: 'breakfast' | 'lunch' | 'dinner' | 'snack', count: number = 5): Promise<Recipe[]> {
  const typeMap: Record<string, string> = {
    breakfast: 'breakfast',
    lunch: 'main course,salad,soup',
    dinner: 'main course,dinner',
    snack: 'snack,appetizer',
  };

  const params = new URLSearchParams({
    apiKey: API_KEY,
    number: String(count),
    tags: typeMap[type] || type,
    addRecipeNutrition: 'true',
    addRecipeInstructions: 'true',
  });

  try {
    const res = await fetch(`${BASE_URL}/recipes/random?${params}`);
    if (!res.ok) throw new Error(`Spoonacular API error: ${res.status}`);
    
    const data = await res.json();
    const recipes = (data.recipes || []).map((r: SpoonacularRecipe) => {
      const converted = convertRecipe(r);
      converted.category = type; // Override with requested type
      return converted;
    });
    
    recipes.forEach((r: Recipe) => recipeCache.set(r.id, r));
    return recipes;
  } catch (error) {
    console.error('Spoonacular random error:', error);
    return [];
  }
}

// Get recipe by ID
export async function getRecipeById(id: string | number): Promise<Recipe | null> {
  const strId = String(id);
  
  // Check cache first
  if (recipeCache.has(strId)) {
    return recipeCache.get(strId)!;
  }

  // Extract numeric ID if prefixed
  const numericId = strId.startsWith('spoon-') ? strId.slice(6) : strId;

  const params = new URLSearchParams({
    apiKey: API_KEY,
    includeNutrition: 'true',
  });

  try {
    const res = await fetch(`${BASE_URL}/recipes/${numericId}/information?${params}`);
    if (!res.ok) throw new Error(`Spoonacular API error: ${res.status}`);
    
    const data = await res.json();
    const recipe = convertRecipe(data);
    recipeCache.set(recipe.id, recipe);
    return recipe;
  } catch (error) {
    console.error('Spoonacular getById error:', error);
    return null;
  }
}

// Get similar recipes
export async function getSimilarRecipes(id: string | number, count: number = 3): Promise<Recipe[]> {
  const numericId = String(id).startsWith('spoon-') ? String(id).slice(6) : String(id);

  const params = new URLSearchParams({
    apiKey: API_KEY,
    number: String(count),
  });

  try {
    const res = await fetch(`${BASE_URL}/recipes/${numericId}/similar?${params}`);
    if (!res.ok) throw new Error(`Spoonacular API error: ${res.status}`);
    
    const data = await res.json();
    
    // Similar endpoint only returns basic info, need to fetch full details
    const recipes = await Promise.all(
      data.slice(0, count).map((r: { id: number }) => getRecipeById(r.id))
    );
    
    return recipes.filter((r): r is Recipe => r !== null);
  } catch (error) {
    console.error('Spoonacular similar error:', error);
    return [];
  }
}

// Meal planning - generate a day plan
export async function generateMealPlan(options: {
  targetCalories: number;
  diet?: string;
  exclude?: string;
}): Promise<{ meals: Array<{ id: number; title: string; readyInMinutes: number; servings: number }> }> {
  const params = new URLSearchParams({
    apiKey: API_KEY,
    timeFrame: 'day',
    targetCalories: String(options.targetCalories),
  });

  if (options.diet) params.append('diet', options.diet);
  if (options.exclude) params.append('exclude', options.exclude);

  try {
    const res = await fetch(`${BASE_URL}/mealplanner/generate?${params}`);
    if (!res.ok) throw new Error(`Spoonacular API error: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Spoonacular meal plan error:', error);
    return { meals: [] };
  }
}

// Prefetch recipes for meal planning
export async function prefetchMealPlanRecipes(): Promise<{
  breakfast: Recipe[];
  lunch: Recipe[];
  dinner: Recipe[];
  snack: Recipe[];
}> {
  const [breakfast, lunch, dinner, snack] = await Promise.all([
    getRandomRecipes('breakfast', 10),
    getRandomRecipes('lunch', 10),
    getRandomRecipes('dinner', 10),
    getRandomRecipes('snack', 10),
  ]);

  return { breakfast, lunch, dinner, snack };
}

// Clear caches
export function clearCaches(): void {
  recipeCache.clear();
  searchCache.clear();
}
