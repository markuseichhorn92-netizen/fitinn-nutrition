/**
 * Translation Service - Übersetzt Rezepte ins Deutsche
 * Nutzt MyMemory API (kostenlos, 5000 Zeichen/Tag)
 */

// Cache für Übersetzungen
const translationCache = new Map<string, string>();

// MyMemory Translation API (kostenlos)
async function translateText(text: string, from: string = 'en', to: string = 'de'): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  
  // Check cache first
  const cacheKey = `${from}-${to}-${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      console.warn('Translation API error, returning original');
      return text;
    }
    
    const data = await res.json();
    const translated = data.responseData?.translatedText || text;
    
    // Cache result
    translationCache.set(cacheKey, translated);
    
    return translated;
  } catch (error) {
    console.warn('Translation failed:', error);
    return text;
  }
}

// Batch translate multiple strings
async function translateBatch(texts: string[], from: string = 'en', to: string = 'de'): Promise<string[]> {
  // Filter out empty strings and deduplicate
  const uniqueTexts = Array.from(new Set(texts.filter(t => t && t.trim())));
  const results = new Map<string, string>();
  
  // Translate each unique text
  await Promise.all(
    uniqueTexts.map(async (text) => {
      const translated = await translateText(text, from, to);
      results.set(text, translated);
    })
  );
  
  // Return translations in original order
  return texts.map(t => results.get(t) || t);
}

interface SpoonacularIngredient {
  id: number;
  name: string;
  amount: number;
  unit: string;
  aisle: string;
  original?: string;
}

interface SpoonacularRecipe {
  id: number;
  title: string;
  summary?: string;
  instructions?: string;
  analyzedInstructions?: Array<{
    steps: Array<{
      number: number;
      step: string;
    }>;
  }>;
  extendedIngredients?: SpoonacularIngredient[];
  [key: string]: unknown;
}

// Translate a full recipe
export async function translateRecipe(recipe: SpoonacularRecipe): Promise<SpoonacularRecipe> {
  const translated = { ...recipe };
  
  // Collect all texts to translate
  const textsToTranslate: string[] = [];
  const textKeys: Array<{ type: string; index?: number; subIndex?: number }> = [];
  
  // Title
  if (recipe.title) {
    textsToTranslate.push(recipe.title);
    textKeys.push({ type: 'title' });
  }
  
  // Ingredients
  recipe.extendedIngredients?.forEach((ing, i) => {
    if (ing.name) {
      textsToTranslate.push(ing.name);
      textKeys.push({ type: 'ingredient', index: i });
    }
  });
  
  // Instruction steps
  recipe.analyzedInstructions?.[0]?.steps?.forEach((step, i) => {
    if (step.step) {
      textsToTranslate.push(step.step);
      textKeys.push({ type: 'step', index: i });
    }
  });
  
  // Translate all at once
  const translations = await translateBatch(textsToTranslate);
  
  // Apply translations
  let translationIndex = 0;
  
  for (const key of textKeys) {
    const translatedText = translations[translationIndex++];
    
    if (key.type === 'title') {
      translated.title = translatedText;
    } else if (key.type === 'ingredient' && translated.extendedIngredients) {
      translated.extendedIngredients[key.index!].name = translatedText;
    } else if (key.type === 'step' && translated.analyzedInstructions?.[0]?.steps) {
      translated.analyzedInstructions[0].steps[key.index!].step = translatedText;
    }
  }
  
  return translated;
}

// Translate multiple recipes
export async function translateRecipes(recipes: SpoonacularRecipe[]): Promise<SpoonacularRecipe[]> {
  return Promise.all(recipes.map(translateRecipe));
}

// Common cooking terms - pre-translated for speed
const cookingTerms: Record<string, string> = {
  'salt': 'Salz',
  'pepper': 'Pfeffer',
  'sugar': 'Zucker',
  'flour': 'Mehl',
  'butter': 'Butter',
  'oil': 'Öl',
  'olive oil': 'Olivenöl',
  'water': 'Wasser',
  'milk': 'Milch',
  'egg': 'Ei',
  'eggs': 'Eier',
  'chicken': 'Hähnchen',
  'beef': 'Rindfleisch',
  'pork': 'Schweinefleisch',
  'fish': 'Fisch',
  'salmon': 'Lachs',
  'rice': 'Reis',
  'pasta': 'Nudeln',
  'bread': 'Brot',
  'cheese': 'Käse',
  'onion': 'Zwiebel',
  'onions': 'Zwiebeln',
  'garlic': 'Knoblauch',
  'tomato': 'Tomate',
  'tomatoes': 'Tomaten',
  'potato': 'Kartoffel',
  'potatoes': 'Kartoffeln',
  'carrot': 'Karotte',
  'carrots': 'Karotten',
  'lemon': 'Zitrone',
  'cream': 'Sahne',
  'sour cream': 'Sauerrahm',
  'yogurt': 'Joghurt',
  'honey': 'Honig',
  'vanilla': 'Vanille',
  'cinnamon': 'Zimt',
  'basil': 'Basilikum',
  'parsley': 'Petersilie',
  'thyme': 'Thymian',
  'rosemary': 'Rosmarin',
  'oregano': 'Oregano',
  'cumin': 'Kreuzkümmel',
  'paprika': 'Paprika',
  'ginger': 'Ingwer',
  'baking powder': 'Backpulver',
  'baking soda': 'Natron',
  'yeast': 'Hefe',
  'tablespoon': 'EL',
  'tablespoons': 'EL',
  'teaspoon': 'TL',
  'teaspoons': 'TL',
  'cup': 'Tasse',
  'cups': 'Tassen',
  'ounce': 'Unze',
  'ounces': 'Unzen',
  'pound': 'Pfund',
  'pounds': 'Pfund',
  'clove': 'Zehe',
  'cloves': 'Zehen',
  'slice': 'Scheibe',
  'slices': 'Scheiben',
  'piece': 'Stück',
  'pieces': 'Stücke',
  'pinch': 'Prise',
  'to taste': 'nach Geschmack',
  'optional': 'optional',
  'fresh': 'frisch',
  'dried': 'getrocknet',
  'chopped': 'gehackt',
  'minced': 'fein gehackt',
  'diced': 'gewürfelt',
  'sliced': 'in Scheiben',
  'ground': 'gemahlen',
  'whole': 'ganz',
  'large': 'groß',
  'medium': 'mittel',
  'small': 'klein',
};

// Quick translate using dictionary (no API call)
export function quickTranslate(text: string): string {
  const lower = text.toLowerCase().trim();
  if (cookingTerms[lower]) {
    return cookingTerms[lower];
  }
  
  // Try to match partial terms
  for (const [en, de] of Object.entries(cookingTerms)) {
    if (lower.includes(en)) {
      return text.replace(new RegExp(en, 'gi'), de);
    }
  }
  
  return text;
}
