'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    // Create printable HTML
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>FIT-INN Einkaufsliste</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0d9488; }
          h2 { color: #666; margin-top: 20px; }
          .item { padding: 8px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
          .amount { color: #666; }
        </style>
      </head>
      <body>
        <h1>🛒 FIT-INN Einkaufsliste</h1>
        <p>Für die nächsten 7 Tage</p>
        ${Object.entries(groupByCategory(items)).map(([category, categoryItems]) => `
          <h2>${category}</h2>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const groupedItems = groupByCategory(items);
  const uncheckedCount = items.length - checkedItems.size;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-dark-900/95 backdrop-blur-lg z-10 px-6 py-4 border-b border-dark-800">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">🛒 Einkaufsliste</h1>
          <button
            onClick={exportPDF}
            className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium"
          >
            📄 PDF
          </button>
        </div>
        <p className="text-dark-400 text-sm">
          Für die nächsten 7 Tage • {uncheckedCount} von {items.length} offen
        </p>
      </div>

      {/* Shopping List */}
      <div className="px-6 py-4">
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category} className="mb-6">
            <h2 className="text-sm font-semibold text-dark-400 mb-2 uppercase tracking-wider">
              {category}
            </h2>
            <div className="glass rounded-2xl divide-y divide-dark-700">
              {(categoryItems as ShoppingItem[]).map((item) => (
                <button
                  key={item.name}
                  onClick={() => toggleItem(item.name)}
                  className={`w-full p-4 flex items-center justify-between text-left transition-all ${
                    checkedItems.has(item.name) ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                        checkedItems.has(item.name)
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-dark-500'
                      }`}
                    >
                      {checkedItems.has(item.name) && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={checkedItems.has(item.name) ? 'line-through' : ''}>
                      {item.name}
                    </span>
                  </div>
                  <span className="text-dark-400">
                    {formatAmount(item.amount)} {item.unit}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
