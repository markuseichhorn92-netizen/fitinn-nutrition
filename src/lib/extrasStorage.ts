// Storage for scanned/manual extras per day

export interface ScannedProduct {
  id: string;
  name: string;
  brand: string;
  barcode: string;
  quantity: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  addedAt: string;
}

export interface DayExtras {
  date: string;
  products: ScannedProduct[];
}

const STORAGE_KEY = 'fitinn-extras';

export function loadExtras(date: string): ScannedProduct[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const allExtras: DayExtras[] = JSON.parse(data);
    const dayExtras = allExtras.find(d => d.date === date);
    return dayExtras?.products || [];
  } catch {
    return [];
  }
}

export function saveExtra(date: string, product: ScannedProduct): void {
  if (typeof window === 'undefined') return;
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    let allExtras: DayExtras[] = data ? JSON.parse(data) : [];
    
    const dayIndex = allExtras.findIndex(d => d.date === date);
    if (dayIndex >= 0) {
      allExtras[dayIndex].products.push(product);
    } else {
      allExtras.push({ date, products: [product] });
    }
    
    // Keep only last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    allExtras = allExtras.filter(d => new Date(d.date) >= thirtyDaysAgo);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allExtras));
  } catch {
    console.error('Failed to save extra');
  }
}

export function removeExtra(date: string, productId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;
    
    const allExtras: DayExtras[] = JSON.parse(data);
    const dayIndex = allExtras.findIndex(d => d.date === date);
    
    if (dayIndex >= 0) {
      allExtras[dayIndex].products = allExtras[dayIndex].products.filter(p => p.id !== productId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allExtras));
    }
  } catch {
    console.error('Failed to remove extra');
  }
}

export function getExtrasTotals(date: string): { calories: number; protein: number; carbs: number; fat: number } {
  const products = loadExtras(date);
  return products.reduce(
    (acc, p) => ({
      calories: acc.calories + Math.round(p.nutrition.calories * p.quantity),
      protein: acc.protein + Math.round(p.nutrition.protein * p.quantity),
      carbs: acc.carbs + Math.round(p.nutrition.carbs * p.quantity),
      fat: acc.fat + Math.round(p.nutrition.fat * p.quantity),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
