import { NextRequest, NextResponse } from 'next/server';
import { translateRecipe, translateRecipes } from '@/lib/translate';

// Hardcoded key for now (Vercel ENV issue debugging)
const API_KEY = '5d497a5334804128b400da1a1898d1d4';
const THEMEALDB_URL = 'https://www.themealdb.com/api/json/v1/1';
const BASE_URL = 'https://api.spoonacular.com';

// Cache recipes in memory (server-side) - stores TRANSLATED recipes
const recipeCache = new Map<string, unknown>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours (translated recipes don't change)

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

function getCached(key: string): unknown | null {
  const entry = recipeCache.get(key) as CacheEntry | undefined;
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setCache(key: string, data: unknown): void {
  recipeCache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'random';
  const type = searchParams.get('type') || 'main course';
  const query = searchParams.get('query') || '';
  const id = searchParams.get('id');
  const number = searchParams.get('number') || '10';
  const diet = searchParams.get('diet');
  const lang = searchParams.get('lang') || 'de'; // Default to German
  const debug = searchParams.get('debug') === 'true';

  try {
    // Debug mode
    if (debug) {
      return NextResponse.json({
        apiKeySet: !!API_KEY,
        apiKeyLength: API_KEY?.length || 0,
        apiKeyFirst4: API_KEY?.substring(0, 4) || 'none',
        envKeySet: !!process.env.SPOONACULAR_API_KEY,
        action,
        type,
        number,
        lang,
      });
    }
    // Get recipe by ID
    if (action === 'get' && id) {
      const numericId = id.startsWith('spoon-') ? id.slice(6) : id;
      const cacheKey = `recipe-${numericId}-${lang}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }

      const res = await fetch(
        `${BASE_URL}/recipes/${numericId}/information?apiKey=${API_KEY}&includeNutrition=true`
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      let data = await res.json();
      
      // Translate if German requested (with fallback)
      if (lang === 'de') {
        try {
          data = await translateRecipe(data);
        } catch (translateErr) {
          console.warn('Translation failed:', translateErr);
        }
      }
      
      setCache(cacheKey, data);
      return NextResponse.json(data);
    }

    // Search recipes
    if (action === 'search' && query) {
      const cacheKey = `search-${query}-${type}-${diet}-${number}-${lang}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }

      const params = new URLSearchParams({
        apiKey: API_KEY,
        query,
        number,
        addRecipeNutrition: 'true',
        addRecipeInstructions: 'true',
        fillIngredients: 'true',
      });
      if (diet) params.append('diet', diet);
      if (type) params.append('type', type);

      const res = await fetch(`${BASE_URL}/recipes/complexSearch?${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      
      // Translate results if German requested (with fallback)
      if (lang === 'de' && data.results) {
        try {
          data.results = await translateRecipes(data.results);
        } catch (translateErr) {
          console.warn('Translation failed:', translateErr);
        }
      }
      
      setCache(cacheKey, data);
      return NextResponse.json(data);
    }

    // Get random recipes by type
    if (action === 'random') {
      const cacheKey = `random-${type}-${diet}-${number}-${lang}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }

      // Step 1: Get random recipe IDs
      const randomParams = new URLSearchParams({
        apiKey: API_KEY,
        number,
        tags: type,
      });
      if (diet) randomParams.append('diet', diet);

      const randomRes = await fetch(`${BASE_URL}/recipes/random?${randomParams}`);
      if (!randomRes.ok) throw new Error(`API error: ${randomRes.status}`);
      const randomData = await randomRes.json();
      
      // Step 2: Fetch full details with nutrition for each recipe
      const recipeIds = (randomData.recipes || []).map((r: { id: number }) => r.id);
      
      if (recipeIds.length > 0) {
        const bulkParams = new URLSearchParams({
          apiKey: API_KEY,
          ids: recipeIds.join(','),
          includeNutrition: 'true',
        });
        
        const bulkRes = await fetch(`${BASE_URL}/recipes/informationBulk?${bulkParams}`);
        if (bulkRes.ok) {
          let recipes = await bulkRes.json();
          
          // Translate recipes if German requested (with fallback)
          if (lang === 'de' && recipes && Array.isArray(recipes)) {
            try {
              recipes = await translateRecipes(recipes);
            } catch (translateErr) {
              console.warn('Translation failed, using original:', translateErr);
              // Continue with untranslated recipes
            }
          }
          
          const data = { recipes };
          setCache(cacheKey, data);
          return NextResponse.json(data);
        }
      }
      
      // Fallback: return random data without nutrition
      if (lang === 'de' && randomData.recipes) {
        try {
          randomData.recipes = await translateRecipes(randomData.recipes);
        } catch (translateErr) {
          console.warn('Translation failed, using original:', translateErr);
        }
      }
      setCache(cacheKey, randomData);
      return NextResponse.json(randomData);
    }

    // Get similar recipes
    if (action === 'similar' && id) {
      const numericId = id.startsWith('spoon-') ? id.slice(6) : id;
      const res = await fetch(
        `${BASE_URL}/recipes/${numericId}/similar?apiKey=${API_KEY}&number=${number}`
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Meal plan generation
    if (action === 'mealplan') {
      const targetCalories = searchParams.get('targetCalories') || '2000';
      const params = new URLSearchParams({
        apiKey: API_KEY,
        timeFrame: 'day',
        targetCalories,
      });
      if (diet) params.append('diet', diet);

      const res = await fetch(`${BASE_URL}/mealplanner/generate?${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Spoonacular API error:', error);
    
    // If Spoonacular fails (402 = quota exceeded), try TheMealDB as fallback
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('402') || errorMsg.includes('401')) {
      console.log('Spoonacular quota exceeded, falling back to TheMealDB');
      try {
        // Map Spoonacular type tags to our meal types
        const typeToMealType: Record<string, string> = {
          'breakfast': 'breakfast',
          'main course': 'dinner',
          'main course,salad,soup': 'lunch',
          'main course,dinner': 'dinner',
          'snack': 'snack',
          'snack,appetizer': 'snack',
        };
        const mealType = typeToMealType[type] || 'lunch';
        let fallbackRecipes = await fetchFromTheMealDB(parseInt(number) || 5, mealType);
        if (fallbackRecipes.length > 0) {
          // Translate TheMealDB recipes to German
          try {
            fallbackRecipes = await translateRecipes(fallbackRecipes as Parameters<typeof translateRecipes>[0]);
          } catch (translateErr) {
            console.warn('Translation of MealDB recipes failed:', translateErr);
          }
          return NextResponse.json({ recipes: fallbackRecipes, source: 'themealdb' });
        }
      } catch (fallbackError) {
        console.error('TheMealDB fallback also failed:', fallbackError);
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch recipes',
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}

// Map our meal types to TheMealDB categories
const mealTypeToTheMealDBCategories: Record<string, string[]> = {
  breakfast: ['Breakfast'],
  lunch: ['Beef', 'Chicken', 'Pork', 'Lamb', 'Pasta', 'Vegetarian', 'Vegan', 'Seafood'],
  dinner: ['Beef', 'Chicken', 'Pork', 'Lamb', 'Pasta', 'Vegetarian', 'Vegan', 'Seafood'],
  snack: ['Starter', 'Side', 'Dessert', 'Miscellaneous'],
};

// TheMealDB Fallback - kostenlos, unlimited
async function fetchFromTheMealDB(count: number, requestedType?: string): Promise<unknown[]> {
  const recipes: unknown[] = [];
  
  // Determine which TheMealDB categories to use
  const categories = requestedType 
    ? mealTypeToTheMealDBCategories[requestedType] || ['Miscellaneous']
    : ['Beef', 'Chicken', 'Vegetarian', 'Pasta']; // Default mix
  
  // Try to get recipes from appropriate categories
  for (const category of categories) {
    if (recipes.length >= count) break;
    
    try {
      const res = await fetch(`${THEMEALDB_URL}/filter.php?c=${encodeURIComponent(category)}`);
      if (!res.ok) continue;
      
      const data = await res.json();
      if (!data.meals || data.meals.length === 0) continue;
      
      // Get random recipes from this category
      const shuffled = data.meals.sort(() => Math.random() - 0.5);
      const needed = Math.min(count - recipes.length, Math.ceil(count / categories.length), shuffled.length);
      
      // Fetch full details for each recipe
      for (let i = 0; i < needed && recipes.length < count; i++) {
        const mealId = shuffled[i].idMeal;
        const detailRes = await fetch(`${THEMEALDB_URL}/lookup.php?i=${mealId}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData.meals && detailData.meals[0]) {
            recipes.push(convertMealDBRecipe(detailData.meals[0]));
          }
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch TheMealDB category ${category}:`, err);
    }
  }
  
  // Fallback to random if we couldn't get enough from categories
  if (recipes.length < count) {
    const remaining = count - recipes.length;
    const promises = Array(Math.min(remaining, 5)).fill(null).map(() => 
      fetch(`${THEMEALDB_URL}/random.php`).then(r => r.json()).catch(() => null)
    );
    
    const results = await Promise.all(promises);
    for (const result of results) {
      if (result?.meals?.[0]) {
        recipes.push(convertMealDBRecipe(result.meals[0]));
      }
    }
  }
  
  return recipes;
}

// Unit translations for TheMealDB
const unitTranslations: Record<string, string> = {
  'tablespoon': 'EL', 'tablespoons': 'EL', 'tbsp': 'EL', 'Tbsp': 'EL', 'tbs': 'EL',
  'teaspoon': 'TL', 'teaspoons': 'TL', 'tsp': 'TL', 'Tsp': 'TL',
  'cup': 'Tasse', 'cups': 'Tassen',
  'ounce': 'oz', 'ounces': 'oz', 'oz': 'oz',
  'pound': 'Pfund', 'pounds': 'Pfund', 'lb': 'Pfund', 'lbs': 'Pfund',
  'gram': 'g', 'grams': 'g', 'g': 'g',
  'kg': 'kg', 'kilogram': 'kg',
  'ml': 'ml', 'milliliter': 'ml',
  'liter': 'l', 'liters': 'l', 'l': 'l',
  'pinch': 'Prise', 'clove': 'Zehe', 'cloves': 'Zehen',
  'slice': 'Scheibe', 'slices': 'Scheiben',
  'piece': 'Stück', 'pieces': 'Stück',
  'serving': 'Portion', 'servings': 'Portionen',
  'small': 'klein', 'medium': 'mittel', 'large': 'groß',
  'bunch': 'Bund', 'can': 'Dose', 'handful': 'Handvoll',
  'dash': 'Spritzer', 'drop': 'Tropfen', 'drops': 'Tropfen',
};

function translateMeasure(measure: string): string {
  if (!measure) return 'Stück';
  const trimmed = measure.trim().toLowerCase();
  // Check for exact match
  if (unitTranslations[trimmed]) return unitTranslations[trimmed];
  // Check if measure contains a known unit
  for (const [en, de] of Object.entries(unitTranslations)) {
    if (trimmed.includes(en.toLowerCase())) {
      return measure.replace(new RegExp(en, 'gi'), de);
    }
  }
  return measure;
}

// Parse measurement string like "200 g" or "2 tablespoons" into amount + unit
function parseMeasure(measure: string): { amount: number; unit: string } {
  if (!measure || !measure.trim()) {
    return { amount: 1, unit: 'Stück' };
  }
  
  const trimmed = measure.trim();
  
  // Try to extract number from beginning (handles "200 g", "2.5 cups", "1/2 tsp")
  const fractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)\s*(.*)$/);
  if (fractionMatch) {
    const amount = parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
    const unit = fractionMatch[3]?.trim() || 'Stück';
    return { amount, unit: translateMeasure(unit) };
  }
  
  const numberMatch = trimmed.match(/^([\d.]+)\s*(.*)$/);
  if (numberMatch) {
    const amount = parseFloat(numberMatch[1]) || 1;
    const unit = numberMatch[2]?.trim() || 'Stück';
    return { amount, unit: translateMeasure(unit) };
  }
  
  // No number found - might be "pinch", "to taste", etc.
  return { amount: 1, unit: translateMeasure(trimmed) };
}

// Convert TheMealDB recipe to Spoonacular-like format
function convertMealDBRecipe(meal: Record<string, string | null>): unknown {
  // Extract ingredients (TheMealDB has strIngredient1-20 and strMeasure1-20)
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      const { amount, unit } = parseMeasure(measure || '');
      ingredients.push({
        name: ingredient.trim(),
        amount,
        unit,
        aisle: 'Sonstiges',
      });
    }
  }

  // Map TheMealDB category to our meal type
  const categoryMap: Record<string, string> = {
    'Breakfast': 'breakfast',
    'Starter': 'snack',
    'Side': 'snack',
    'Dessert': 'snack',
    'Beef': 'dinner',
    'Chicken': 'dinner',
    'Lamb': 'dinner',
    'Pork': 'dinner',
    'Seafood': 'dinner',
    'Vegetarian': 'lunch',
    'Vegan': 'lunch',
    'Pasta': 'lunch',
    'Miscellaneous': 'lunch',
  };

  const category = meal.strCategory || 'Miscellaneous';
  
  return {
    id: parseInt(meal.idMeal || '0'),
    title: meal.strMeal || 'Unbekanntes Rezept',
    image: meal.strMealThumb || '',
    servings: 4,
    readyInMinutes: 30,
    extendedIngredients: ingredients,
    analyzedInstructions: meal.strInstructions ? [{
      steps: meal.strInstructions.split('\r\n').filter(Boolean).map((step, i) => ({
        number: i + 1,
        step: step.trim(),
      }))
    }] : [],
    nutrition: {
      // TheMealDB doesn't have nutrition, estimate based on category
      nutrients: [
        { name: 'Calories', amount: category === 'Dessert' ? 350 : 450, unit: 'kcal' },
        { name: 'Protein', amount: category === 'Vegetarian' ? 15 : 25, unit: 'g' },
        { name: 'Carbohydrates', amount: 40, unit: 'g' },
        { name: 'Fat', amount: 20, unit: 'g' },
        { name: 'Fiber', amount: 5, unit: 'g' },
      ],
    },
    dishTypes: [categoryMap[category] || 'dinner'],
    vegetarian: category === 'Vegetarian' || category === 'Vegan',
    vegan: category === 'Vegan',
    sourceUrl: meal.strSource || meal.strYoutube || '',
  };
}
