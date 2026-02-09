'use client';

import { useState, useEffect, useCallback } from 'react';

const WATER_LOG_KEY = 'fitinn_water_log';

interface WaterEntry {
  time: string;
  amount: number;
}

interface WaterDayData {
  entries: WaterEntry[];
  total: number;
}

function loadWaterLog(date: string): WaterDayData {
  if (typeof window === 'undefined') return { entries: [], total: 0 };
  try {
    const data = localStorage.getItem(WATER_LOG_KEY);
    const all = data ? JSON.parse(data) : {};
    return all[date] || { entries: [], total: 0 };
  } catch {
    return { entries: [], total: 0 };
  }
}

function saveWaterLog(date: string, data: WaterDayData): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(WATER_LOG_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[date] = data;
    localStorage.setItem(WATER_LOG_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

function syncLegacyStorage(date: string, total: number): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('fitinn_water_intake');
    const all = raw ? JSON.parse(raw) : {};
    all[date] = total;
    localStorage.setItem('fitinn_water_intake', JSON.stringify(all));
  } catch { /* ignore */ }
}

// Single glass component
function WaterGlass({
  filled,
  partial = 0,
  onClick,
  index,
}: {
  filled: boolean;
  partial?: number; // 0-1 for partially filled
  onClick?: () => void;
  index: number;
}) {
  return (
    <button
      onClick={onClick}
      className="relative w-10 h-12 transition-all duration-300 hover:scale-110 active:scale-95 touch-manipulation"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Glass outline */}
      <svg viewBox="0 0 40 48" className="w-full h-full">
        {/* Glass shape */}
        <path
          d="M6 8 L8 42 Q8 46 12 46 L28 46 Q32 46 32 42 L34 8 Q34 4 30 4 L10 4 Q6 4 6 8 Z"
          fill={filled ? '#3b82f6' : partial > 0 ? `rgba(59, 130, 246, ${partial})` : '#e5e7eb'}
          stroke={filled ? '#2563eb' : '#d1d5db'}
          strokeWidth="1.5"
          className="transition-all duration-300"
        />
        {/* Water level animation when partially filled */}
        {partial > 0 && partial < 1 && (
          <path
            d={`M8 ${46 - (partial * 38)} Q20 ${44 - (partial * 38)} 32 ${46 - (partial * 38)} L32 42 Q32 46 28 46 L12 46 Q8 46 8 42 Z`}
            fill="#3b82f6"
            className="transition-all duration-300"
          />
        )}
        {/* Shine effect */}
        {filled && (
          <ellipse
            cx="14"
            cy="16"
            rx="4"
            ry="6"
            fill="rgba(255,255,255,0.4)"
          />
        )}
      </svg>
      {/* Ripple effect on filled */}
      {filled && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-30" />
        </div>
      )}
    </button>
  );
}

interface WaterTrackerYazioProps {
  goal: number; // in liters
  date: string;
}

export default function WaterTrackerYazio({ goal, date }: WaterTrackerYazioProps) {
  const [data, setData] = useState<WaterDayData>({ entries: [], total: 0 });
  const [animating, setAnimating] = useState(false);
  const [showAddOptions, setShowAddOptions] = useState(false);

  // Calculate glasses (250ml each)
  const glassSize = 0.25; // 250ml
  const totalGlasses = Math.ceil(goal / glassSize);
  const filledGlasses = Math.floor(data.total / glassSize);
  const partialFill = (data.total % glassSize) / glassSize;

  useEffect(() => {
    setData(loadWaterLog(date));
  }, [date]);

  const addWater = useCallback((amount: number) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newEntry: WaterEntry = { time: timeStr, amount };
    const newTotal = Math.round((data.total + amount) * 100) / 100;
    const newData: WaterDayData = {
      entries: [...data.entries, newEntry],
      total: newTotal,
    };
    setData(newData);
    saveWaterLog(date, newData);
    syncLegacyStorage(date, newTotal);
    
    setAnimating(true);
    setTimeout(() => setAnimating(false), 600);
    setShowAddOptions(false);
  }, [data, date]);

  const removeLastGlass = useCallback(() => {
    if (data.entries.length === 0) return;
    const entries = [...data.entries];
    const removed = entries.pop();
    const newTotal = Math.max(0, Math.round((data.total - (removed?.amount || 0.25)) * 100) / 100);
    const newData: WaterDayData = { entries, total: newTotal };
    setData(newData);
    saveWaterLog(date, newData);
    syncLegacyStorage(date, newTotal);
  }, [data, date]);

  const isComplete = data.total >= goal;
  const percentage = Math.min((data.total / goal) * 100, 100);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
            isComplete ? 'bg-green-100' : 'bg-blue-100'
          } ${animating ? 'scale-110' : ''}`}>
            <span className="text-xl">{isComplete ? '✅' : '💧'}</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Wasserzähler</h3>
            <p className="text-xs text-gray-500">Ziel: {goal.toFixed(2)} Liter</p>
          </div>
        </div>
        
        {/* Current Amount - Large Display */}
        <div className="text-right">
          <p className={`text-2xl font-bold transition-all duration-300 ${
            animating ? 'scale-110' : ''
          } ${isComplete ? 'text-green-500' : 'text-blue-600'}`}>
            {data.total.toFixed(2)}L
          </p>
          <p className="text-xs text-gray-400">{Math.round(percentage)}%</p>
        </div>
      </div>

      {/* Glasses Grid */}
      <div className="flex flex-wrap gap-1 justify-center mb-4 py-3 bg-gray-50 rounded-xl">
        {Array.from({ length: Math.min(totalGlasses, 12) }).map((_, i) => (
          <WaterGlass
            key={i}
            index={i}
            filled={i < filledGlasses}
            partial={i === filledGlasses ? partialFill : 0}
            onClick={() => {
              if (i < filledGlasses) {
                // Could implement removing specific glass
              } else {
                addWater(glassSize);
              }
            }}
          />
        ))}
        {totalGlasses > 12 && (
          <div className="w-10 h-12 flex items-center justify-center text-gray-400 text-xs font-medium">
            +{totalGlasses - 12}
          </div>
        )}
      </div>

      {/* Quick Info */}
      <div className="flex items-center justify-center gap-1 mb-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1">
          <WaterGlass filled={true} index={0} />
          <span>= 250ml</span>
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => addWater(0.25)}
          className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
            animating ? 'scale-95' : 'hover:scale-[1.02]'
          } bg-blue-100 text-blue-700 hover:bg-blue-200 active:bg-blue-300 flex items-center justify-center gap-2`}
        >
          <span>🥛</span>
          <span>+250ml</span>
        </button>
        
        <button
          onClick={() => addWater(0.5)}
          className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
            animating ? 'scale-95' : 'hover:scale-[1.02]'
          } bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 flex items-center justify-center gap-2`}
        >
          <span>🍶</span>
          <span>+500ml</span>
        </button>

        {data.entries.length > 0 && (
          <button
            onClick={removeLastGlass}
            className="px-3 py-3 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            title="Letztes Glas entfernen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Water from food hint */}
      <button
        onClick={() => setShowAddOptions(!showAddOptions)}
        className="w-full mt-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-1"
      >
        <span>+ Wasser aus Lebensmitteln: 0 ml</span>
        <svg className={`w-3 h-3 transition-transform ${showAddOptions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Custom amount panel */}
      {showAddOptions && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl animate-in slide-in-from-top-2 duration-200">
          <p className="text-xs text-gray-500 mb-2 font-medium">Eigene Menge hinzufügen:</p>
          <div className="flex gap-2 flex-wrap">
            {[0.1, 0.15, 0.2, 0.33, 0.75, 1.0].map((amount) => (
              <button
                key={amount}
                onClick={() => addWater(amount)}
                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                +{amount * 1000}ml
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Success message */}
      {isComplete && (
        <div className="mt-4 py-3 bg-green-50 rounded-xl text-center">
          <p className="text-green-600 font-medium">
            🎉 Tagesziel erreicht!
          </p>
          <p className="text-xs text-green-500 mt-1">
            Du hast {data.total.toFixed(2)}L von {goal.toFixed(2)}L getrunken
          </p>
        </div>
      )}
    </div>
  );
}
