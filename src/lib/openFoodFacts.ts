/**
 * Open Food Facts API Integration
 * https://world.openfoodfacts.org/api/v2/product/{barcode}
 */

export interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  product_name_de?: string;
  brands?: string;
  image_url?: string;
  image_front_url?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments: {
    'energy-kcal_100g'?: number;
    'energy-kcal'?: number;
    proteins_100g?: number;
    proteins?: number;
    carbohydrates_100g?: number;
    carbohydrates?: number;
    fat_100g?: number;
    fat?: number;
    fiber_100g?: number;
  };
}

export interface ProductResult {
  found: boolean;
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  servingSize: number; // in grams
  nutritionPer100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

const API_URL = 'https://world.openfoodfacts.org/api/v2/product';

export async function fetchProductByBarcode(barcode: string): Promise<ProductResult> {
  try {
    const response = await fetch(`${API_URL}/${barcode}`, {
      headers: {
        'User-Agent': 'FitInnNutrition/1.0 (contact@fitinn.de)',
      },
    });

    if (!response.ok) {
      return {
        found: false,
        barcode,
        name: '',
        servingSize: 100,
        nutritionPer100g: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      };
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return {
        found: false,
        barcode,
        name: '',
        servingSize: 100,
        nutritionPer100g: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      };
    }

    const product = data.product as OpenFoodFactsProduct;
    const nutriments = product.nutriments || {};

    // Prefer German product name
    const name = product.product_name_de || product.product_name || 'Unbekanntes Produkt';

    // Parse serving size (e.g., "100g", "30 g", "250ml")
    let servingSize = 100;
    if (product.serving_quantity) {
      servingSize = product.serving_quantity;
    } else if (product.serving_size) {
      const match = product.serving_size.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        servingSize = parseFloat(match[1]);
      }
    }

    return {
      found: true,
      barcode,
      name,
      brand: product.brands,
      imageUrl: product.image_front_url || product.image_url,
      servingSize,
      nutritionPer100g: {
        calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
        protein: Math.round((nutriments.proteins_100g || nutriments.proteins || 0) * 10) / 10,
        carbs: Math.round((nutriments.carbohydrates_100g || nutriments.carbohydrates || 0) * 10) / 10,
        fat: Math.round((nutriments.fat_100g || nutriments.fat || 0) * 10) / 10,
      },
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    return {
      found: false,
      barcode,
      name: '',
      servingSize: 100,
      nutritionPer100g: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };
  }
}

/**
 * Calculate nutrition for a specific quantity
 */
export function calculateNutritionForQuantity(
  nutritionPer100g: { calories: number; protein: number; carbs: number; fat: number },
  quantityGrams: number
): { calories: number; protein: number; carbs: number; fat: number } {
  const factor = quantityGrams / 100;
  return {
    calories: Math.round(nutritionPer100g.calories * factor),
    protein: Math.round(nutritionPer100g.protein * factor * 10) / 10,
    carbs: Math.round(nutritionPer100g.carbs * factor * 10) / 10,
    fat: Math.round(nutritionPer100g.fat * factor * 10) / 10,
  };
}
