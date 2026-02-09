'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailHint, setShowEmailHint] = useState(false);

  // Check if user already has a profile
  useEffect(() => {
    const profile = localStorage.getItem('fitinn_user_profile');
    if (profile) {
      router.push('/plan');
    }
  }, [router]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Simple email validation
    if (!email || !email.includes('@')) {
      setError('Bitte gib deine E-Mail-Adresse ein');
      return;
    }
    
    setIsLoading(true);
    
    // Store email for later
    localStorage.setItem('fitinn_email', email);
    
    // Small delay for feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    router.push('/onboarding');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Main Content - Mobile First */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 safe-area-top">
        
        {/* Logo with Glow */}
        <div className="relative mb-8">
          <Image 
            src="/logo.png" 
            alt="FIT-INN" 
            width={100} 
            height={100} 
            className="rounded-2xl shadow-xl"
            priority
          />
          <div className="absolute inset-0 bg-teal-500/20 blur-3xl rounded-full -z-10 scale-150" />
        </div>

        {/* Title - Big & Clear */}
        <h1 className="text-3xl font-bold text-center mb-3 text-gray-900">
          Dein Ernährungsplan
        </h1>
        <p className="text-gray-500 text-center text-lg mb-10 max-w-xs">
          Einfach. Persönlich. Lecker.
        </p>

        {/* Benefits - Simple Icons */}
        <div className="grid grid-cols-2 gap-4 mb-10 w-full max-w-sm">
          {[
            { icon: '✅', text: 'Auf dich abgestimmt' },
            { icon: '📱', text: 'Immer dabei' },
            { icon: '🍳', text: 'Einfache Rezepte' },
            { icon: '🛒', text: 'Einkaufsliste inklusive' },
          ].map((item, i) => (
            <div 
              key={i} 
              className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sm font-medium text-gray-700">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Email Form - Super Simple */}
        <form onSubmit={handleStart} className="w-full max-w-sm space-y-4">
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              onFocus={() => setShowEmailHint(true)}
              onBlur={() => setShowEmailHint(false)}
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:border-teal-500 focus:bg-white outline-none text-gray-900 text-lg placeholder-gray-400 transition-all"
              placeholder="Deine E-Mail-Adresse"
              autoComplete="email"
              inputMode="email"
            />
            
            {/* Help Hint */}
            {showEmailHint && (
              <div className="absolute -top-12 left-0 right-0 bg-gray-800 text-white text-sm px-4 py-2 rounded-xl animate-fade-in-up">
                💡 Die E-Mail von deinem FIT-INN Vertrag
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm px-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Big CTA Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-xl shadow-lg shadow-orange-500/30 disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Einen Moment...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Los geht's
                <span className="text-2xl">→</span>
              </span>
            )}
          </button>
        </form>

        {/* Trust Badge */}
        <div className="mt-8 flex items-center gap-2 text-gray-400 text-sm">
          <span>🔒</span>
          <span>Deine Daten sind sicher</span>
        </div>
      </div>

      {/* Footer - Minimal */}
      <footer className="py-6 px-6 text-center border-t border-gray-100">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Image 
            src="/logo.png" 
            alt="FIT-INN" 
            width={24} 
            height={24} 
            className="rounded"
          />
          <span className="font-semibold text-gray-600">FIT-INN Trier</span>
        </div>
        <p className="text-gray-400 text-xs">
          © 2026 • Seit 1996 in Trier
        </p>
      </footer>
    </div>
  );
}
