'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [memberNumber, setMemberNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate login (MVP - no actual auth)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For MVP, any valid-looking input works
    if (email && memberNumber) {
      // Check if user has completed onboarding
      const profile = localStorage.getItem('fitinn_user_profile');
      if (profile) {
        router.push('/plan');
      } else {
        router.push('/onboarding');
      }
    } else {
      setError('Bitte fülle alle Felder aus.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-4xl font-black text-white">FI</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-3 text-gray-900">
          <span className="text-teal-600">FIT-INN</span> Nutrition
        </h1>
        <p className="text-gray-500 text-center text-lg mb-8 max-w-md">
          Dein persönlicher Ernährungsplan – abgestimmt auf deine Ziele
        </p>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-4 mb-10 w-full max-w-md">
          {[
            { icon: '🎯', text: 'Personalisiert' },
            { icon: '📊', text: 'Kalorienziele' },
            { icon: '🥗', text: '500+ Rezepte' },
            { icon: '🛒', text: 'Einkaufsliste' },
          ].map((benefit, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
              <span className="text-2xl mb-2 block">{benefit.icon}</span>
              <span className="text-sm text-gray-700 font-medium">{benefit.text}</span>
            </div>
          ))}
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-Mail Adresse
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-gray-900 placeholder-gray-400"
              placeholder="deine@email.de"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mitgliedsnummer
            </label>
            <input
              type="text"
              value={memberNumber}
              onChange={(e) => setMemberNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-gray-900 placeholder-gray-400"
              placeholder="z.B. M-12345"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Anmelden...
              </span>
            ) : (
              'Jetzt starten'
            )}
          </button>
        </form>

        <p className="text-gray-500 text-sm mt-6 text-center">
          Noch kein Mitglied?{' '}
          <a href="https://fitinn-trier.de" className="text-teal-600 hover:underline font-medium">
            Jetzt bei FIT-INN anmelden
          </a>
        </p>
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 text-center text-gray-400 text-sm">
        <p>© 2026 FIT-INN Trier • Ernährungsplan powered by AI</p>
      </footer>
    </div>
  );
}
