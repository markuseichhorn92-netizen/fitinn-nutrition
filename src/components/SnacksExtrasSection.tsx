'use client';

import { useState } from 'react';
import { ScannedItem } from '@/types';
import { removeScannedItem } from '@/lib/storage';
import BarcodeScannerModal from './BarcodeScannerModal';

interface SnacksExtrasSectionProps {
  date: string;
  items: ScannedItem[];
  onItemAdded: (item: ScannedItem) => void;
  onItemRemoved: (itemId: string) => void;
}

export default function SnacksExtrasSection({ 
  date, 
  items, 
  onItemAdded,
  onItemRemoved 
}: SnacksExtrasSectionProps) {
  const [showScanner, setShowScanner] = useState(false);

  const totalNutrition = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.nutrition.calories,
      protein: acc.protein + item.nutrition.protein,
      carbs: acc.carbs + item.nutrition.carbs,
      fat: acc.fat + item.nutrition.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const handleRemoveItem = (itemId: string) => {
    if (confirm('Produkt entfernen?')) {
      removeScannedItem(date, itemId);
      onItemRemoved(itemId);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍫</span>
          <div>
            <h3 className="font-semibold text-gray-900">Snacks & Extras</h3>
            <p className="text-xs text-gray-500">Gescannte Produkte</p>
          </div>
        </div>
        <button
          onClick={() => setShowScanner(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors touch-manipulation"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Scannen</span>
        </button>
      </div>

      {/* Items List */}
      {items.length > 0 ? (
        <div className="space-y-3 mb-4">
          {items.map((item) => (
            <div 
              key={item.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
            >
              {/* Product Image or Placeholder */}
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  className="w-12 h-12 object-cover rounded-lg bg-white"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-xl">
                  📦
                </div>
              )}

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{item.quantity}g</span>
                  <span>•</span>
                  <span className="font-semibold text-teal-600">{item.nutrition.calories} kcal</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{item.nutrition.protein}g P</span>
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors touch-manipulation"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400">
          <div className="text-4xl mb-2">📷</div>
          <p className="text-sm">
            Tippe auf + um ein Produkt zu scannen
          </p>
        </div>
      )}

      {/* Total (only show if items exist) */}
      {items.length > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Gesamt Extras:</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-bold text-teal-600">{totalNutrition.calories} kcal</span>
              <span className="text-red-500">{Math.round(totalNutrition.protein * 10) / 10}g P</span>
              <span className="text-yellow-500">{Math.round(totalNutrition.carbs * 10) / 10}g K</span>
              <span className="text-blue-500">{Math.round(totalNutrition.fat * 10) / 10}g F</span>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onAddItem={(item) => {
          onItemAdded(item);
          setShowScanner(false);
        }}
      />
    </div>
  );
}
