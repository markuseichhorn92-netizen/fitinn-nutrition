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

interface WaterTrackerProps {
  goal: number;
  date: string;
}

export default function WaterTracker({ goal, date }: WaterTrackerProps) {
  const [data, setData] = useState<WaterDayData>({ entries: [], total: 0 });
  const [animating, setAnimating] = useState(false);

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
    
    // Animation
    setAnimating(true);
    setTimeout(() => setAnimating(false), 500);
  }, [data, date]);

  const removeWater = useCallback(() => {
    if (data.total <= 0) return;
    const entries = [...data.entries];
    const removed = entries.pop();
    const newTotal = Math.max(0, Math.round((data.total - (removed?.amount || 0.25)) * 100) / 100);
    const newData: WaterDayData = { entries, total: newTotal };
    setData(newData);
    saveWaterLog(date, newData);
  }, [data, date]);

  const percentage = Math.min((data.total / goal) * 100, 100);
  const isComplete = data.total >= goal;
  const glasses = Math.floor(data.total / 0.25);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-2xl transition-transform ${animating ? 'scale-125' : ''}`}>
            {isComplete ? '✅' : '💧'}
          </span>
          <span className="font-semibold text-gray-900 text-lg">Wasser</span>
        </div>
        {data.entries.length > 0 && (
          <button
            onClick={removeWater}
            className="text-sm text-gray-400 px-3 py-1.5 rounded-lg bg-gray-50 active:bg-gray-100 touch-manipulation"
          >
            ↩️ Zurück
          </button>
        )}
      </div>

      {/* Big Display */}
      <div className="text-center mb-4">
        <p className={`text-4xl font-bold transition-all ${
          animating ? 'scale-110 text-blue-500' : isComplete ? 'text-green-500' : 'text-blue-600'
        }`}>
          {data.total.toFixed(1)} L
        </p>
        <p className="text-gray-500 mt-1">
          von {goal.toFixed(1)} L
        </p>
        {isComplete && (
          <p className="text-green-600 font-medium mt-2">🎉 Geschafft!</p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isComplete ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Big Add Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => addWater(0.25)}
          className="py-4 rounded-2xl bg-blue-50 text-blue-600 font-semibold text-lg active:scale-[0.98] transition-transform touch-manipulation"
        >
          🥤 +1 Glas
        </button>
        <button
          onClick={() => addWater(0.5)}
          className="py-4 rounded-2xl bg-blue-500 text-white font-semibold text-lg active:scale-[0.98] transition-transform touch-manipulation"
        >
          🍶 +½ Liter
        </button>
      </div>

      {/* Simple Glass Counter */}
      {glasses > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500 text-center">
            {glasses} {glasses === 1 ? 'Glas' : 'Gläser'} getrunken heute
          </p>
        </div>
      )}
    </div>
  );
}
