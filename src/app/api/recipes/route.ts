import { NextRequest, NextResponse } from 'next/server';
import recipesData from '@/data/recipes.json';

// Type for our local recipes
interface LocalRecipe {
  id: string;
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  tags: string[];
  prepTime: number;
  cookTime: number;
  totalTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  servings: number;
  image: string;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
    category: string;
  }>;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  instructions: string[];
  allergens: string[];
  dietaryFlags: string[];
  mealPrepable: boolean;
  storageDays: number;
}

const recipes = recipesData as LocalRecipe[];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'random';
  const type = searchParams.get('type') || 'lunch';
  const query = searchParams.get('query') || '';
  const id = searchParams.get('id');
  const number = parseInt(searchParams.get('number') || '10');
  const diet = searchParams.get('diet');

  try {
    // Get recipe by ID
    if (action === 'get' && id) {
      const recipe = recipes.find(r => r.id === id);
      if (!recipe) {
        return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
      }
      return NextResponse.json(convertToSpoonacularFormat(recipe));
    }

    // Search recipes
    if (action === 'search' && query) {
      const q = query.toLowerCase();
      let results = recipes.filter(r => 
        r.name.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q)) ||
        r.ingredients.some(i => i.name.toLowerCase().includes(q))
      );

      // Apply diet filter
      if (diet) {
        results = filterByDiet(results, diet);
      }

      return NextResponse.json({
        results: results.slice(0, number).map(convertToSpoonacularFormat),
      });
    }

    // Get random recipes by type (category)
    if (action === 'random') {
      const categoryMap: Record<string, string[]> = {
        'breakfast': ['breakfast'],
        'main course': ['lunch', 'dinner'],
        'main course,salad,soup': ['lunch'],
        'main course,dinner': ['dinner'],
        'snack': ['snack'],
        'snack,appetizer': ['snack'],
        'lunch': ['lunch'],
        'dinner': ['dinner'],
      };

      const categories = categoryMap[type] || ['lunch', 'dinner'];
      let filtered = recipes.filter(r => categories.includes(r.category));

      // Apply diet filter
      if (diet) {
        filtered = filterByDiet(filtered, diet);
      }

      // Shuffle and limit
      const shuffled = filtered.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, number);

      return NextResponse.json({
        recipes: selected.map(convertToSpoonacularFormat),
        source: 'local',
        total: filtered.length,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Recipe API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

// Filter recipes by diet type
function filterByDiet(recipes: LocalRecipe[], diet: string): LocalRecipe[] {
  const dietLower = diet.toLowerCase();
  
  if (dietLower === 'vegetarian') {
    return recipes.filter(r => 
      r.dietaryFlags.includes('vegetarian') || r.dietaryFlags.includes('vegan')
    );
  }
  if (dietLower === 'vegan') {
    return recipes.filter(r => r.dietaryFlags.includes('vegan'));
  }
  if (dietLower === 'gluten free' || dietLower === 'gluten-free') {
    return recipes.filter(r => r.dietaryFlags.includes('gluten-free'));
  }
  
  return recipes;
}

// Convert our format to Spoonacular-like format (for compatibility with existing code)
function convertToSpoonacularFormat(recipe: LocalRecipe) {
  return {
    id: parseInt(recipe.id.replace(/\D/g, '')) || Math.random() * 10000,
    title: recipe.name,
    image: recipe.image,
    servings: recipe.servings,
    readyInMinutes: recipe.totalTime,
    preparationMinutes: recipe.prepTime,
    cookingMinutes: recipe.cookTime,
    extendedIngredients: recipe.ingredients.map((ing, i) => ({
      id: i,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      aisle: ing.category,
    })),
    analyzedInstructions: [{
      steps: recipe.instructions.map((step, i) => ({
        number: i + 1,
        step,
      })),
    }],
    nutrition: {
      nutrients: [
        { name: 'Calories', amount: recipe.nutrition.calories, unit: 'kcal' },
        { name: 'Protein', amount: recipe.nutrition.protein, unit: 'g' },
        { name: 'Carbohydrates', amount: recipe.nutrition.carbs, unit: 'g' },
        { name: 'Fat', amount: recipe.nutrition.fat, unit: 'g' },
        { name: 'Fiber', amount: recipe.nutrition.fiber, unit: 'g' },
      ],
    },
    dishTypes: [recipe.category],
    vegetarian: recipe.dietaryFlags.includes('vegetarian'),
    vegan: recipe.dietaryFlags.includes('vegan'),
    glutenFree: recipe.dietaryFlags.includes('gluten-free'),
    dairyFree: recipe.dietaryFlags.includes('dairy-free'),
  };
}
