// Chefkoch API wrapper
// API docs: https://api.chefkoch.de/v2

import { Recipe, Ingredient, Nutrition } from '@/types';

export interface ChefkochRecipe {
  id: string;
  title: string;
  subtitle?: string;
  preparationTime: number;
  difficulty: 1 | 2 | 3;
  servings: number;
  kCalories?: number;
  previewImageUrlTemplate?: string;
  rating?: {
    rating: number;
    numVotes: number;
  };
  tags?: string[];
  ingredientGroups?: {
    header?: string;
    ingredients: {
      name: string;
      amount: number;
      unit: string;
      foodId?: string;
      usageInfo?: string;
    }[];
  }[];
  instructions?: string;
  isVegan?: boolean;
  isVegetarian?: boolean;
}

export interface ChefkochSearchResult {
  results: ChefkochRecipe[];
  count: number;
}

// Get image URL from template
export function getChefkochImageUrl(template?: string): string {
  if (!template) {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=480&h=300&fit=crop';
  }
  return template.replace('<format>', 'crop-480x300');
}

// Map Chefkoch difficulty to our format
function mapDifficulty(difficulty: number): 'easy' | 'medium' | 'hard' {
  switch (difficulty) {
    case 1: return 'easy';
    case 2: return 'medium';
    case 3: return 'hard';
    default: return 'medium';
  }
}

// Determine meal category from tags, title and ingredients
function determineCategory(recipe: ChefkochRecipe): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const title = recipe.title.toLowerCase();
  const tags = (recipe.tags || []).map(t => t.toLowerCase());
  
  // Breakfast indicators
  if (tags.includes('frühstück') || 
      title.includes('müsli') || 
      title.includes('porridge') ||
      title.includes('oatmeal') ||
      title.includes('pancake') ||
      title.includes('pfannkuchen') ||
      title.includes('smoothie bowl') ||
      title.includes('frühstücks')) {
    return 'breakfast';
  }
  
  // Snack indicators
  if (tags.includes('snack') || 
      tags.includes('dessert') ||
      tags.includes('kuchen') ||
      tags.includes('fingerfood') ||
      title.includes('riegel') ||
      title.includes('energie') ||
      title.includes('pudding') ||
      (recipe.kCalories && recipe.kCalories < 250)) {
    return 'snack';
  }
  
  // Dinner indicators (heavier meals, evening dishes)
  if (tags.includes('abendessen') ||
      title.includes('braten') ||
      title.includes('auflauf') ||
      title.includes('gratin') ||
      title.includes('lasagne') ||
      title.includes('burger')) {
    return 'dinner';
  }
  
  // Default to lunch for main dishes
  return 'lunch';
}

// Estimate nutrition from calories (rough approximation)
function estimateNutrition(kCalories: number | undefined, servings: number): Nutrition {
  const calories = kCalories || 400; // Default estimate
  
  // Rough macro split: 25% protein, 45% carbs, 30% fat
  // Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g
  const proteinCals = calories * 0.25;
  const carbsCals = calories * 0.45;
  const fatCals = calories * 0.30;
  
  return {
    calories: Math.round(calories),
    protein: Math.round(proteinCals / 4),
    carbs: Math.round(carbsCals / 4),
    fat: Math.round(fatCals / 9),
    fiber: Math.round(calories / 100), // Rough estimate: ~1g per 100kcal
  };
}

// Map ingredients from Chefkoch format
function mapIngredients(groups: ChefkochRecipe['ingredientGroups']): Ingredient[] {
  if (!groups) return [];
  
  const categoryMap: Record<string, string> = {
    'fleisch': 'Fleisch',
    'fisch': 'Fisch',
    'gemüse': 'Gemüse',
    'obst': 'Obst',
    'milch': 'Milchprodukte',
    'käse': 'Milchprodukte',
    'joghurt': 'Milchprodukte',
    'sahne': 'Milchprodukte',
    'butter': 'Fette',
    'öl': 'Fette',
    'mehl': 'Getreide',
    'reis': 'Getreide',
    'nudel': 'Getreide',
    'pasta': 'Getreide',
    'brot': 'Getreide',
    'ei': 'Eier',
    'eier': 'Eier',
    'salz': 'Gewürze',
    'pfeffer': 'Gewürze',
    'zucker': 'Süßungsmittel',
    'honig': 'Süßungsmittel',
  };
  
  function guessCategory(name: string): string {
    const lowerName = name.toLowerCase();
    for (const [key, category] of Object.entries(categoryMap)) {
      if (lowerName.includes(key)) return category;
    }
    return 'Sonstiges';
  }
  
  const ingredients: Ingredient[] = [];
  for (const group of groups) {
    for (const ing of group.ingredients) {
      ingredients.push({
        name: ing.name,
        amount: ing.amount || 1,
        unit: ing.unit || 'Stück',
        category: guessCategory(ing.name),
      });
    }
  }
  
  return ingredients;
}

// Detect allergens from ingredients
function detectAllergens(ingredients: Ingredient[]): string[] {
  const allergens: Set<string> = new Set();
  
  const allergenMap: Record<string, string[]> = {
    gluten: ['mehl', 'brot', 'nudel', 'pasta', 'weizen', 'roggen', 'gerste', 'dinkel', 'hafer', 'semmel', 'paniermehl'],
    lactose: ['milch', 'sahne', 'joghurt', 'quark', 'butter', 'käse', 'mozzarella', 'parmesan', 'frischkäse', 'schmand'],
    nuts: ['mandel', 'walnuss', 'haselnuss', 'cashew', 'pistazien', 'erdnuss', 'nuss'],
    eggs: ['ei', 'eier', 'eigelb', 'eiweiß'],
    soy: ['soja', 'tofu', 'edamame'],
    fish: ['lachs', 'thunfisch', 'dorsch', 'kabeljau', 'forelle', 'sardine', 'makrele', 'hering', 'fisch'],
  };
  
  for (const ing of ingredients) {
    const name = ing.name.toLowerCase();
    for (const [allergen, keywords] of Object.entries(allergenMap)) {
      if (keywords.some(kw => name.includes(kw))) {
        allergens.add(allergen);
      }
    }
  }
  
  return Array.from(allergens);
}

// Detect dietary flags
function detectDietaryFlags(recipe: ChefkochRecipe, ingredients: Ingredient[]): string[] {
  const flags: string[] = [];
  
  if (recipe.isVegan) flags.push('vegan');
  if (recipe.isVegetarian) flags.push('vegetarian');
  
  // Check for meat/fish to determine vegetarian/vegan
  const meatFish = ['fleisch', 'huhn', 'hähnchen', 'rind', 'schwein', 'lamm', 'fisch', 'lachs', 'thunfisch', 'garnele', 'schinken', 'speck', 'wurst'];
  const dairy = ['milch', 'sahne', 'joghurt', 'käse', 'butter', 'quark', 'ei', 'eier'];
  
  const hasMeat = ingredients.some(ing => meatFish.some(m => ing.name.toLowerCase().includes(m)));
  const hasDairy = ingredients.some(ing => dairy.some(d => ing.name.toLowerCase().includes(d)));
  
  if (!hasMeat && !flags.includes('vegetarian')) flags.push('vegetarian');
  if (!hasMeat && !hasDairy && !flags.includes('vegan')) flags.push('vegan');
  
  // Check for low-carb (rough estimate based on common low-carb ingredients)
  const lowCarbTags = (recipe.tags || []).map(t => t.toLowerCase());
  if (lowCarbTags.includes('low carb') || lowCarbTags.includes('keto')) {
    flags.push('low-carb');
  }
  
  // Check for high protein
  if (lowCarbTags.includes('eiweißreich') || lowCarbTags.includes('high protein')) {
    flags.push('high-protein');
  }
  
  return Array.from(new Set(flags));
}

// Convert Chefkoch recipe to our Recipe format
export function convertChefkochRecipe(chefkoch: ChefkochRecipe): Recipe {
  const ingredients = mapIngredients(chefkoch.ingredientGroups);
  const nutrition = estimateNutrition(chefkoch.kCalories, chefkoch.servings);
  const allergens = detectAllergens(ingredients);
  const dietaryFlags = detectDietaryFlags(chefkoch, ingredients);
  
  // Parse instructions - split by newlines or numbered steps
  let instructions: string[] = [];
  if (chefkoch.instructions) {
    instructions = chefkoch.instructions
      .split(/\n|\r\n|\d+\.\s*/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  return {
    id: `ck-${chefkoch.id}`,
    name: chefkoch.title,
    category: determineCategory(chefkoch),
    tags: chefkoch.tags || [],
    prepTime: Math.max(5, chefkoch.preparationTime || 15),
    cookTime: Math.max(0, (chefkoch.preparationTime || 15) - 5),
    totalTime: chefkoch.preparationTime || 15,
    difficulty: mapDifficulty(chefkoch.difficulty),
    servings: chefkoch.servings || 2,
    image: getChefkochImageUrl(chefkoch.previewImageUrlTemplate),
    ingredients,
    nutrition,
    instructions: instructions.length > 0 ? instructions : ['Siehe Originalrezept auf Chefkoch.de'],
    allergens,
    dietaryFlags,
    mealPrepable: chefkoch.preparationTime && chefkoch.preparationTime <= 30 ? true : false,
    storageDays: chefkoch.preparationTime && chefkoch.preparationTime <= 20 ? 2 : 1,
  };
}

// Client-side API functions (call our proxy routes)
export async function fetchRecipes(limit: number = 50): Promise<Recipe[]> {
  try {
    const response = await fetch(`/api/recipes?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch recipes');
    const data = await response.json();
    return data.recipes;
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return [];
  }
}

export async function searchRecipes(query: string, limit: number = 20): Promise<Recipe[]> {
  try {
    const response = await fetch(`/api/recipes/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to search recipes');
    const data = await response.json();
    return data.recipes;
  } catch (error) {
    console.error('Error searching recipes:', error);
    return [];
  }
}

export async function fetchRecipeById(id: string): Promise<Recipe | null> {
  try {
    // Strip the 'ck-' prefix if present
    const chefkochId = id.startsWith('ck-') ? id.slice(3) : id;
    const response = await fetch(`/api/recipes/${chefkochId}`);
    if (!response.ok) throw new Error('Failed to fetch recipe');
    const data = await response.json();
    return data.recipe;
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return null;
  }
}

// Cache key for localStorage
const RECIPES_CACHE_KEY = 'fitinn_recipes_cache';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface RecipeCache {
  recipes: Recipe[];
  timestamp: number;
}

// Save recipes to cache
export function cacheRecipes(recipes: Recipe[]): void {
  if (typeof window === 'undefined') return;
  
  const cache: RecipeCache = {
    recipes,
    timestamp: Date.now(),
  };
  localStorage.setItem(RECIPES_CACHE_KEY, JSON.stringify(cache));
}

// Load recipes from cache
export function loadCachedRecipes(): Recipe[] | null {
  if (typeof window === 'undefined') return null;
  
  const data = localStorage.getItem(RECIPES_CACHE_KEY);
  if (!data) return null;
  
  try {
    const cache: RecipeCache = JSON.parse(data);
    // Check if cache is still valid
    if (Date.now() - cache.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(RECIPES_CACHE_KEY);
      return null;
    }
    return cache.recipes;
  } catch {
    return null;
  }
}
