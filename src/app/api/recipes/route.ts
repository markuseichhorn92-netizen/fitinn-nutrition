import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.SPOONACULAR_API_KEY || '5d497a5334804128b400da1a1898d1d4';
const BASE_URL = 'https://api.spoonacular.com';

// Cache recipes in memory (server-side)
const recipeCache = new Map<string, unknown>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

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

  try {
    // Get recipe by ID
    if (action === 'get' && id) {
      const numericId = id.startsWith('spoon-') ? id.slice(6) : id;
      const cacheKey = `recipe-${numericId}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }

      const res = await fetch(
        `${BASE_URL}/recipes/${numericId}/information?apiKey=${API_KEY}&includeNutrition=true`
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setCache(cacheKey, data);
      return NextResponse.json(data);
    }

    // Search recipes
    if (action === 'search' && query) {
      const cacheKey = `search-${query}-${type}-${diet}-${number}`;
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
      setCache(cacheKey, data);
      return NextResponse.json(data);
    }

    // Get random recipes by type
    if (action === 'random') {
      const cacheKey = `random-${type}-${diet}-${number}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }

      const params = new URLSearchParams({
        apiKey: API_KEY,
        number,
        tags: type,
        addRecipeNutrition: 'true',
        addRecipeInstructions: 'true',
      });
      if (diet) params.append('diet', diet);

      const res = await fetch(`${BASE_URL}/recipes/random?${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setCache(cacheKey, data);
      return NextResponse.json(data);
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
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}
