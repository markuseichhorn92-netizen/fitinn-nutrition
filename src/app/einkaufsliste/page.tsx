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
  'Getreide', 'Hülsenfrüchte', 'Nüsse', 'Samen', 'Fette', 'Gewürze',
  'Kräuter', 'Saucen', 'Aufstriche', 'Süßungsmittel', 'Nahrungsergänzung',
  'Backzutaten', 'Soja', 'Süßes', 'Sonstiges',
];

const categoryEmojis: Record<string, string> = {
  'Obst': '🍎', 'Gemüse': '🥬', 'Fleisch': '🥩', 'Fisch': '🐟',
  'Milchprodukte': '🥛', 'Eier': '🥚', 'Getreide': '🌾', 'Hülsenfrüchte': '🫘',
  'Nüsse': '🥜', 'Samen': '🌱', 'Fette': '🫒', 'Gewürze': '🧂',
  'Kräuter': '🌿', 'Saucen': '🥫', 'Aufstriche': '🍯', 'Süßungsmittel': '🍬',
  'Nahrungsergänzung': '💊', 'Backzutaten': '🧁', 'Soja': '🫛', 'Süßes': '🍫',
  'Sonstiges': '📦',
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

    // Load saved checked items
    setCheckedItems(loadCheckedItems());

    // Load all stored plans for this week
    const weekDates = getWeekDates();
    const storedPlans = loadAllPlans();
    const plans: DayPlan[] = [];

    for (const dateStr of weekDates) {
      const plan = storedPlans[dateStr];
      if (plan) {
        plans.push(plan);
      }
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

  const groupByCategory = (items: ShoppingItem[]) => {
    return items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ShoppingItem[]>);
  };

  const formatAmount = (amount: number): string => {
    if (amount >= 1000) return (amount / 1000).toFixed(1) + 'kg';
    return amount % 1 === 0 ? amount.toString() : amount.toFixed(1);
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const groupedItems = groupByCategory(items);
  const uncheckedCount = items.length - checkedItems.size;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 lg:px-6 py-4 border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/plan" className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors lg:block hidden">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-2xl">🛒</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Einkaufsliste</h1>
              <p className="text-sm text-gray-500">
                Diese Woche • {items.length > 0 ? `${uncheckedCount} von ${items.length} offen` : 'Keine Pläne vorhanden'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">📋</span>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Keine Einkaufsliste</h2>
            <p className="text-gray-500 mb-6">Erstelle zuerst einen Ernährungsplan, damit die Einkaufsliste generiert werden kann.</p>
            <Link href="/plan" className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors">
              Zum Ernährungsplan
            </Link>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Fortschritt</span>
                <span className="text-sm text-gray-500">{checkedItems.size} von {items.length} erledigt</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500"
                  style={{ width: `${items.length > 0 ? (checkedItems.size / items.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="lg:grid lg:grid-cols-2 lg:gap-6">
              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category} className="mb-6 lg:mb-0">
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <span className="text-xl">{categoryEmojis[category] || '📦'}</span>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{category}</h2>
                    <span className="text-xs text-gray-400 ml-auto">
                      {categoryItems.filter(i => checkedItems.has(i.name)).length}/{categoryItems.length}
                    </span>
                  </div>
                  <div className="bg-white rounded-2xl divide-y divide-gray-100 shadow-sm overflow-hidden">
                    {categoryItems.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => toggleItem(item.name)}
                        className={`w-full p-4 flex items-center justify-between text-left transition-all hover:bg-gray-50 ${
                          checkedItems.has(item.name) ? 'bg-gray-50/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            checkedItems.has(item.name) ? 'bg-teal-500 border-teal-500' : 'border-gray-300 hover:border-teal-400'
                          }`}>
                            {checkedItems.has(item.name) && (
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-gray-700 ${checkedItems.has(item.name) ? 'line-through text-gray-400' : ''}`}>
                            {item.name}
                          </span>
                        </div>
                        <span className="text-gray-400 text-sm font-medium">
                          {formatAmount(item.amount)} {item.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
