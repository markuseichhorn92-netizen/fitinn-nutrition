import { NextRequest, NextResponse } from 'next/server';
import { ChefkochRecipe, convertChefkochRecipe } from '@/lib/chefkoch';
import recipesData from '@/data/recipes.json';
import { Recipe } from '@/types';

const CHEFKOCH_API = 'https://api.chefkoch.de/v2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Check if it's a mock recipe ID (numeric without ck- prefix)
  if (/^\d+$/.test(id) && parseInt(id) < 100) {
    const mockRecipes = recipesData as Recipe[];
    const recipe = mockRecipes.find(r => r.id === id);
    
    if (recipe) {
      return NextResponse.json({ recipe, source: 'fallback' });
    }
  }
  
  // Strip ck- prefix if present
  const chefkochId = id.startsWith('ck-') ? id.slice(3) : id;
  
  try {
    // Fetch from Chefkoch API
    const response = await fetch(`${CHEFKOCH_API}/recipes/${chefkochId}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FitINN-Nutrition/1.0',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`Chefkoch API error: ${response.status}`);
    }
    
    const data: ChefkochRecipe = await response.json();
    const recipe = convertChefkochRecipe(data);
    
    return NextResponse.json({ recipe, source: 'chefkoch' });
    
  } catch (error) {
    console.error('Chefkoch recipe fetch error:', error);
    
    // Try to find in mock data as fallback
    const mockRecipes = recipesData as Recipe[];
    const mockRecipe = mockRecipes.find(r => r.id === id || r.id === `ck-${id}`);
    
    if (mockRecipe) {
      return NextResponse.json({ recipe: mockRecipe, source: 'fallback' });
    }
    
    return NextResponse.json(
      { error: 'Recipe not found' }, 
      { status: 404 }
    );
  }
}
