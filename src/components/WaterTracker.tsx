'use client';

import { useState, useEffect, useCallback } from 'react';

const WATER_LOG_KEY = 'fitinn_water_log';

interface WaterEntry {
  time: string; // HH:MM
  amount: number; // in liters
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

// Also update legacy storage for compatibility
function syncLegacyStorage(date: string, total: number): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('fitinn_water_intake');
    const all = raw ? JSON.parse(raw) : {};
    all[date] = total;
    localStorage.setItem('fitinn_water_intake', JSON.stringify(all));
  } catch { /* ignore */ }
}

interface WaterTrackerProps {
  goal: number; // in liters
  date: string;
}

export default function WaterTracker({ goal, date }: WaterTrackerProps) {
  const [data, setData] = useState<WaterDayData>({ entries: [], total: 0 });
  const [animating, setAnimating] = useState(false);
  const [lastAdded, setLastAdded] = useState<number | null>(null);

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
    
    // Animation
    setLastAdded(amount * 1000);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 600);
  }, [data, date]);

  const removeWater = useCallback(() => {
    if (data.total <= 0) return;
    const entries = [...data.entries];
    const removed = entries.pop();
    const newTotal = Math.max(0, Math.round((data.total - (removed?.amount || 0.25)) * 100) / 100);
    const newData: WaterDayData = { entries, total: newTotal };
    setData(newData);
    saveWaterLog(date, newData);
    syncLegacyStorage(date, newTotal);
  }, [data, date]);

  const percentage = Math.min((data.total / goal) * 100, 100);
  const isComplete = data.total >= goal;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-2xl transition-transform duration-300 ${animating ? 'scale-125' : ''}`}>
            {isComplete ? '✅' : '💧'}
          </span>
          <span className="font-semibold text-gray-900 text-lg">Wasser</span>
        </div>
        {data.entries.length > 0 && (
          <button
            onClick={removeWater}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50"
          >
            Rückgängig
          </button>
        )}
      </div>

      {/* Prominent Display */}
      <div className="text-center mb-3">
        <p className={`text-3xl font-bold transition-all duration-300 ${animating ? 'scale-110 text-blue-500' : isComplete ? 'text-green-500' : 'text-blue-600'}`}>
          {data.total.toFixed(1)}L
          <span className="text-lg font-normal text-gray-400"> / {goal.toFixed(1)}L</span>
        </p>
        {animating && lastAdded && (
          <span className="inline-block text-sm text-blue-400 animate-bounce mt-1">
            +{lastAdded}ml 💧
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-4 relative">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isComplete
              ? 'bg-gradient-to-r from-green-400 to-emerald-500'
              : 'bg-gradient-to-r from-cyan-400 to-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-sm">
          {Math.round(percentage)}%
        </span>
      </div>

      {/* Add Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => addWater(0.25)}
          className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
            animating ? 'scale-95' : 'hover:scale-[1.02]'
          } bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200`}
        >
          🥤 +250ml
        </button>
        <button
          onClick={() => addWater(0.5)}
          className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
            animating ? 'scale-95' : 'hover:scale-[1.02]'
          } bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700`}
        >
          🍶 +500ml
        </button>
      </div>

      {/* Timeline */}
      {data.entries.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tagesverlauf</p>
          <div className="flex items-center gap-1 flex-wrap">
            {data.entries.map((entry, i) => (
              <div
                key={i}
                className="group relative flex flex-col items-center"
                title={`${entry.time} — ${entry.amount * 1000}ml`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all ${
                  entry.amount >= 0.5
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-100 text-blue-500'
                }`}>
                  💧
                </div>
                <span className="text-[9px] text-gray-400 mt-0.5">{entry.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goal info */}
      {isComplete && (
        <p className="text-center text-sm text-green-600 font-medium mt-3">
          🎉 Tagesziel erreicht!
        </p>
      )}
    </div>
  );
}
