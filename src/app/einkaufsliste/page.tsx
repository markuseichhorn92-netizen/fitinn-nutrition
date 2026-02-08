'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { loadProfile, loadAllPlans } from '@/lib/storage';
import { generateDayPlan, generateShoppingList } from '@/lib/mealPlanGenerator';
import { UserProfile, DayPlan, ShoppingItem } from '@/types';

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

const categoryOrder = [
  'Obst',
  'Gemüse',
  'Fleisch',
  'Fisch',
  'Milchprodukte',
  'Eier',
  'Getreide',
  'Hülsenfrüchte',
  'Nüsse',
  'Samen',
  'Fette',
  'Gewürze',
  'Kräuter',
  'Saucen',
  'Aufstriche',
  'Süßungsmittel',
  'Nahrungsergänzung',
  'Backzutaten',
  'Soja',
  'Süßes',
  'Sonstiges',
];

const categoryEmojis: Record<string, string> = {
  'Obst': '🍎',
  'Gemüse': '🥬',
  'Fleisch': '🥩',
  'Fisch': '🐟',
  'Milchprodukte': '🥛',
  'Eier': '🥚',
  'Getreide': '🌾',
  'Hülsenfrüchte': '🫘',
  'Nüsse': '🥜',
  'Samen': '🌱',
  'Fette': '🫒',
  'Gewürze': '🧂',
  'Kräuter': '🌿',
  'Saucen': '🥫',
  'Aufstriche': '🍯',
  'Süßungsmittel': '🍬',
  'Nahrungsergänzung': '💊',
  'Backzutaten': '🧁',
  'Soja': '🫛',
  'Süßes': '🍫',
  'Sonstiges': '📦',
};

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

    // Generate shopping list for the next 7 days
    const today = new Date();
    const plans: DayPlan[] = [];
    const storedPlans = loadAllPlans();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = getDateString(date);

      let plan = storedPlans[dateStr];
      if (!plan) {
        plan = generateDayPlan(dateStr, storedProfile);
      }
      plans.push(plan);
    }

    const shoppingMap = generateShoppingList(plans);
    const shoppingItems: ShoppingItem[] = [];

    shoppingMap.forEach((value, key) => {
      shoppingItems.push({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        amount: value.amount,
        unit: value.unit,
        category: value.category,
        checked: false,
      });
    });

    // Sort by category
    shoppingItems.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a.category);
      const indexB = categoryOrder.indexOf(b.category);
      if (indexA === indexB) return a.name.localeCompare(b.name);
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
  };

  const exportPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>FIT-INN Einkaufsliste</title>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; padding: 20px; background: white; }
          h1 { color: #0d9488; font-size: 24px; }
          h2 { color: #374151; margin-top: 24px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
          .item { padding: 12px 0; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; }
          .amount { color: #6b7280; }
          .header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
          .logo { width: 32px; height: 32px; background: #0d9488; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">FI</div>
          <h1>FIT-INN Einkaufsliste</h1>
        </div>
        <p style="color: #6b7280; margin-bottom: 24px;">Für die nächsten 7 Tage</p>
        ${Object.entries(groupByCategory(items)).map(([category, categoryItems]) => `
          <h2>${categoryEmojis[category] || '📦'} ${category}</h2>
          ${(categoryItems as ShoppingItem[]).map(item => `
            <div class="item">
              <span>☐ ${item.name}</span>
              <span class="amount">${formatAmount(item.amount)} ${item.unit}</span>
            </div>
          `).join('')}
        `).join('')}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const groupByCategory = (items: ShoppingItem[]) => {
    return items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ShoppingItem[]>);
  };

  const formatAmount = (amount: number): string => {
    if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'k';
    }
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
      {/* Desktop Header */}
      <div className="hidden lg:block sticky top-0 bg-white z-20 border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/plan" className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛒</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Einkaufsliste</h1>
                <p className="text-sm text-gray-500">Für die nächsten 7 Tage • {uncheckedCount} von {items.length} offen</p>
              </div>
            </div>
          </div>
          <button
            onClick={exportPDF}
            className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Drucken
          </button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 bg-white z-10 px-4 py-4 border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛒</span>
            <h1 className="text-xl font-bold text-gray-900">Einkaufsliste</h1>
          </div>
          <button
            onClick={exportPDF}
            className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            📄 Drucken
          </button>
        </div>
        <p className="text-gray-500 text-sm">
          Für die nächsten 7 Tage • {uncheckedCount} von {items.length} offen
        </p>
      </div>

      {/* Shopping List */}
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Fortschritt</span>
            <span className="text-sm text-gray-500">{checkedItems.size} von {items.length} erledigt</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500"
              style={{ width: `${(checkedItems.size / items.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Categories */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category} className="mb-6 lg:mb-0">
              <div className="flex items-center gap-2 mb-3 px-2">
                <span className="text-xl">{categoryEmojis[category] || '📦'}</span>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  {category}
                </h2>
                <span className="text-xs text-gray-400 ml-auto">
                  {(categoryItems as ShoppingItem[]).filter(i => checkedItems.has(i.name)).length}/{(categoryItems as ShoppingItem[]).length}
                </span>
              </div>
              <div className="bg-white rounded-2xl divide-y divide-gray-100 shadow-sm overflow-hidden">
                {(categoryItems as ShoppingItem[]).map((item) => (
                  <button
                    key={item.name}
                    onClick={() => toggleItem(item.name)}
                    className={`w-full p-4 flex items-center justify-between text-left transition-all hover:bg-gray-50 ${
                      checkedItems.has(item.name) ? 'bg-gray-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          checkedItems.has(item.name)
                            ? 'bg-teal-500 border-teal-500'
                            : 'border-gray-300 hover:border-teal-400'
                        }`}
                      >
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
      </div>

      <BottomNav />
    </div>
  );
}
