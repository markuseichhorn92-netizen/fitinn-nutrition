import { NextRequest, NextResponse } from 'next/server';
import { ChefkochRecipe, convertChefkochRecipe } from '@/lib/chefkoch';
import recipesData from '@/data/recipes.json';
import { Recipe } from '@/types';

const CHEFKOCH_API = 'https://api.chefkoch.de/v2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';
  const limit = parseInt(searchParams.get('limit') || '20');
  
  if (!query) {
    return NextResponse.json({ recipes: [], source: 'none', count: 0 });
  }
  
  try {
    // Try to search via Chefkoch API
    const response = await fetch(
      `${CHEFKOCH_API}/search/recipe?query=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FitINN-Nutrition/1.0',
        },
        next: { revalidate: 1800 }, // Cache for 30 minutes
      }
    );
    
    if (!response.ok) {
      throw new Error(`Chefkoch API error: ${response.status}`);
    }
    
    const data = await response.json();
    const recipes: Recipe[] = [];
    
    // Search results are in data.results[].recipe format
    const items = data.results || data.items || data;
    
    if (Array.isArray(items)) {
      for (const item of items) {
        try {
          // Search results wrap recipe in { recipe: ..., score: ... }
          const rawRecipe = item.recipe || item;
          const recipe = convertChefkochRecipe(rawRecipe as ChefkochRecipe);
          recipes.push(recipe);
        } catch (err) {
          console.error('Error converting recipe:', err);
        }
      }
    }
    
    if (recipes.length > 0) {
      return NextResponse.json({ 
        recipes, 
        source: 'chefkoch',
        count: recipes.length,
        query 
      });
    }
    
    throw new Error('No results from API');
    
  } catch (error) {
    console.error('Chefkoch search error, using fallback:', error);
    
    // Fallback: search in mock data
    const mockRecipes = recipesData as Recipe[];
    const lowerQuery = query.toLowerCase();
    
    const filteredRecipes = mockRecipes.filter(recipe => 
      recipe.name.toLowerCase().includes(lowerQuery) ||
      recipe.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(lowerQuery))
    ).slice(0, limit);
    
    return NextResponse.json({ 
      recipes: filteredRecipes, 
      source: 'fallback',
      count: filteredRecipes.length,
      query 
    });
  }
}
