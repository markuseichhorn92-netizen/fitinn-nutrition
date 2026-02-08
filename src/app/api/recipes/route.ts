import { NextRequest, NextResponse } from 'next/server';
import { ChefkochRecipe, convertChefkochRecipe } from '@/lib/chefkoch';
import recipesData from '@/data/recipes.json';
import { Recipe } from '@/types';

const CHEFKOCH_API = 'https://api.chefkoch.de/v2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  
  try {
    // Try to fetch from Chefkoch API
    const response = await fetch(`${CHEFKOCH_API}/recipes?limit=${limit}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FitINN-Nutrition/1.0',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`Chefkoch API error: ${response.status}`);
    }
    
    const data = await response.json();
    const recipes: Recipe[] = [];
    
    // Handle different response formats
    const items = data.results || data.items || data;
    
    if (Array.isArray(items)) {
      for (const item of items) {
        try {
          const recipe = convertChefkochRecipe(item as ChefkochRecipe);
          recipes.push(recipe);
        } catch (err) {
          console.error('Error converting recipe:', err);
        }
      }
    }
    
    // If we got recipes, return them
    if (recipes.length > 0) {
      return NextResponse.json({ 
        recipes, 
        source: 'chefkoch',
        count: recipes.length 
      });
    }
    
    // Fallback to mock data if no recipes
    throw new Error('No recipes from API');
    
  } catch (error) {
    console.error('Chefkoch API error, using fallback:', error);
    
    // Return mock recipes as fallback
    const mockRecipes = recipesData as Recipe[];
    return NextResponse.json({ 
      recipes: mockRecipes.slice(0, limit), 
      source: 'fallback',
      count: Math.min(mockRecipes.length, limit) 
    });
  }
}
