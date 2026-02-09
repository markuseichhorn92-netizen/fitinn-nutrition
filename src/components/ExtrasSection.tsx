'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { loadExtras, saveExtra, removeExtra, getExtrasTotals, ScannedProduct } from '@/lib/extrasStorage';

// Dynamic import to avoid SSR issues with camera
const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false });

interface ExtrasSectionProps {
  date: string;
  onTotalsChange?: (totals: { calories: number; protein: number; carbs: number; fat: number }) => void;
}

export default function ExtrasSection({ date, onTotalsChange }: ExtrasSectionProps) {
  const [extras, setExtras] = useState<ScannedProduct[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  useEffect(() => {
    const loaded = loadExtras(date);
    setExtras(loaded);
    updateTotals(loaded);
  }, [date]);

  const updateTotals = (products: ScannedProduct[]) => {
    const newTotals = products.reduce(
      (acc, p) => ({
        calories: acc.calories + Math.round(p.nutrition.calories * p.quantity),
        protein: acc.protein + Math.round(p.nutrition.protein * p.quantity),
        carbs: acc.carbs + Math.round(p.nutrition.carbs * p.quantity),
        fat: acc.fat + Math.round(p.nutrition.fat * p.quantity),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    setTotals(newTotals);
    onTotalsChange?.(newTotals);
  };

  const handleProductAdd = (product: any, quantity: number) => {
    const newProduct: ScannedProduct = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: product.name,
      brand: product.brand,
      barcode: product.barcode,
      quantity,
      nutrition: product.nutrition,
      addedAt: new Date().toISOString(),
    };
    
    saveExtra(date, newProduct);
    const updated = [...extras, newProduct];
    setExtras(updated);
    updateTotals(updated);
  };

  const handleRemove = (productId: string) => {
    removeExtra(date, productId);
    const updated = extras.filter(e => e.id !== productId);
    setExtras(updated);
    updateTotals(updated);
  };

  return (
    <div className="px-4 lg:px-8 mb-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm max-w-4xl lg:max-w-none mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍫</span>
            <div>
              <h3 className="font-semibold text-gray-900">Snacks & Extras</h3>
              <p className="text-xs text-gray-500">Zusätzlich konsumierte Lebensmittel</p>
            </div>
          </div>
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Scannen</span>
          </button>
        </div>

        {/* Products List */}
        {extras.length > 0 ? (
          <div className="space-y-2 mb-3">
            {extras.map((product) => (
              <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">
                    {product.brand && `${product.brand} · `}
                    {product.quantity}x · {Math.round(product.nutrition.calories * product.quantity)} kcal
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-teal-600">{Math.round(product.nutrition.protein * product.quantity)}g</p>
                  <p className="text-xs text-gray-400">Protein</p>
                </div>
                <button
                  onClick={() => handleRemove(product.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-gray-400">
            <p className="text-3xl mb-2">📷</p>
            <p className="text-sm">Scanne Barcodes um Snacks hinzuzufügen</p>
          </div>
        )}

        {/* Totals */}
        {extras.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Extras gesamt:</span>
            <div className="flex items-center gap-4 text-sm">
              <span className="font-bold text-teal-600">{totals.calories} kcal</span>
              <span className="text-red-500">{totals.protein}g P</span>
              <span className="text-yellow-600">{totals.carbs}g C</span>
              <span className="text-blue-500">{totals.fat}g F</span>
            </div>
          </div>
        )}
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onProductAdd={handleProductAdd}
      />
    </div>
  );
}
