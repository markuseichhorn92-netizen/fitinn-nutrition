import { NextRequest, NextResponse } from 'next/server';
import { translateRecipe, translateRecipes } from '@/lib/translate';

// Hardcoded key for now (Vercel ENV issue debugging)
const API_KEY = '5d497a5334804128b400da1a1898d1d4';
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
    return NextResponse.json(
      { 
        error: 'Failed to fetch recipes',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
