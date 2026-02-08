'use client';

import { useState, useEffect } from 'react';
import { saveWaterIntake, loadWaterIntake } from '@/lib/storage';

interface WaterTrackerProps {
  goal: number; // in liters
  date: string;
}

export default function WaterTracker({ goal, date }: WaterTrackerProps) {
  const [intake, setIntake] = useState(0);
  const glassSize = 0.25; // 250ml per glass

  useEffect(() => {
    setIntake(loadWaterIntake(date));
  }, [date]);

  const addWater = () => {
    const newIntake = Math.min(intake + glassSize, goal + 1);
    setIntake(newIntake);
    saveWaterIntake(date, newIntake);
  };

  const removeWater = () => {
    const newIntake = Math.max(intake - glassSize, 0);
    setIntake(newIntake);
    saveWaterIntake(date, newIntake);
  };

  const glasses = Math.ceil(goal / glassSize);
  const filledGlasses = Math.floor(intake / glassSize);
  const percentage = Math.min((intake / goal) * 100, 100);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">💧</span>
          <span className="font-semibold">Trinken</span>
        </div>
        <span className="text-sm text-dark-300">
          {intake.toFixed(1)} / {goal.toFixed(1)} L
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-3 bg-dark-700 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Water Glasses */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Array.from({ length: glasses }).map((_, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              i < filledGlasses
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-dark-700 text-dark-500'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={removeWater}
          disabled={intake === 0}
          className="flex-1 py-2 rounded-xl bg-dark-700 text-dark-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-600 transition-colors"
        >
          − 250ml
        </button>
        <button
          onClick={addWater}
          className="flex-1 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
        >
          + 250ml
        </button>
      </div>
    </div>
  );
}
