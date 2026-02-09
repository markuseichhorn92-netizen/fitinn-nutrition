'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { loadProfile, loadAllPlans } from '@/lib/storage';
import { generateShoppingList } from '@/lib/mealPlanGenerator';
import { UserProfile, DayPlan, ShoppingItem } from '@/types';

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

const CHECKED_KEY = 'fitinn_shopping_checked';

const categoryOrder = [
  'Obst', 'Gemüse', 'Fleisch', 'Fisch', 'Milchprodukte', 'Eier',
  'Getreide', 'Hülsenfrüchte', 'Nüsse', 'Fette', 'Gewürze', 'Sonstiges',
];

const categoryEmojis: Record<string, string> = {
  'Obst': '🍎', 'Gemüse': '🥬', 'Fleisch': '🥩', 'Fisch': '🐟',
  'Milchprodukte': '🥛', 'Eier': '🥚', 'Getreide': '🍞', 'Hülsenfrüchte': '🫘',
  'Nüsse': '🥜', 'Fette': '🫒', 'Gewürze': '🧂', 'Sonstiges': '📦',
};

function loadCheckedItems(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const data = localStorage.getItem(CHECKED_KEY);
  return data ? new Set(JSON.parse(data)) : new Set();
}

function saveCheckedItems(items: Set<string>) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CHECKED_KEY, JSON.stringify(Array.from(items)));
  }
}

function getWeekDates(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(getDateString(d));
  }
  return dates;
}

export default function ShoppingListPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedProfile = loadProfile();
    if (!storedProfile) {
      router.push('/onboarding');
      return;
    }
    setProfile(storedProfile);
    setCheckedItems(loadCheckedItems());

    const weekDates = getWeekDates();
    const storedPlans = loadAllPlans();
    const plans: DayPlan[] = [];

    for (const dateStr of weekDates) {
      const plan = storedPlans[dateStr];
      if (plan) plans.push(plan);
    }

    if (plans.length === 0) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const shoppingMap = generateShoppingList(plans);
    const shoppingItems: ShoppingItem[] = [];

    shoppingMap.forEach((value, key) => {
      shoppingItems.push({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        amount: Math.round(value.amount * 10) / 10,
        unit: value.unit,
        category: value.category,
        checked: false,
      });
    });

    shoppingItems.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a.category);
      const indexB = categoryOrder.indexOf(b.category);
      if (indexA === indexB) return a.name.localeCompare(b.name, 'de');
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    setItems(shoppingItems);
    setIsLoading(false);
  }, [router]);

  const toggleItem = (name: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(name)) {
      newChecked.delete(name);
    } else {
      newChecked.add(name);
    }
    setCheckedItems(newChecked);
    saveCheckedItems(newChecked);
  };

  const clearAll = () => {
    setCheckedItems(new Set());
    saveCheckedItems(new Set());
  };

  const groupByCategory = (items: ShoppingItem[]) => {
    return items.reduce((acc, item) => {
      const cat = categoryOrder.includes(item.category) ? item.category : 'Sonstiges';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, ShoppingItem[]>);
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-500">Einkaufsliste wird geladen...</p>
      </div>
    );
  }

  const groupedItems = groupByCategory(items);
  const uncheckedCount = items.length - checkedItems.size;
  const progress = items.length > 0 ? (checkedItems.size / items.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 shadow-sm safe-area-top">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🛒</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Einkaufsliste</h1>
                <p className="text-sm text-gray-500">Diese Woche</p>
              </div>
            </div>
            {checkedItems.size > 0 && (
              <button
                onClick={clearAll}
                className="text-sm text-gray-500 px-3 py-2 rounded-lg bg-gray-100 active:bg-gray-200 touch-manipulation"
              >
                Zurücksetzen
              </button>
            )}
          </div>
          
          {/* Progress */}
          {items.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {progress === 100 ? '🎉 Alles erledigt!' : `${uncheckedCount} übrig`}
                </span>
                <span className="text-sm text-gray-500">{checkedItems.size}/{items.length}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progress === 100 ? 'bg-green-500' : 'bg-teal-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-6xl block mb-4">📋</span>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Noch keine Liste</h2>
            <p className="text-gray-500 mb-6">Erstelle zuerst einen Ernährungsplan</p>
            <Link 
              href="/plan" 
              className="inline-block px-6 py-4 bg-teal-600 text-white rounded-2xl font-semibold active:scale-[0.98] transition-transform touch-manipulation"
            >
              Zum Ernährungsplan →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {categoryOrder.filter(cat => groupedItems[cat]).map((category) => (
              <div key={category}>
                {/* Category Header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-2xl">{categoryEmojis[category]}</span>
                  <h2 className="font-semibold text-gray-700">{category}</h2>
                  <span className="text-sm text-gray-400 ml-auto">
                    {groupedItems[category].filter(i => checkedItems.has(i.name)).length}/{groupedItems[category].length}
                  </span>
                </div>
                
                {/* Items */}
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  {groupedItems[category].map((item, index) => (
                    <button
                      key={item.name}
                      onClick={() => toggleItem(item.name)}
                      className={`w-full p-4 flex items-center gap-4 text-left active:bg-gray-50 transition-colors touch-manipulation ${
                        index > 0 ? 'border-t border-gray-100' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                        checkedItems.has(item.name) 
                          ? 'bg-teal-500 border-teal-500' 
                          : 'border-gray-300'
                      }`}>
                        {checkedItems.has(item.name) && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      
                      {/* Name */}
                      <span className={`flex-1 text-lg ${
                        checkedItems.has(item.name) ? 'text-gray-400 line-through' : 'text-gray-900'
                      }`}>
                        {item.name}
                      </span>
                      
                      {/* Amount */}
                      <span className={`text-sm font-medium ${
                        checkedItems.has(item.name) ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {item.amount >= 1000 
                          ? `${(item.amount / 1000).toFixed(1)} kg` 
                          : `${item.amount} ${item.unit}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
