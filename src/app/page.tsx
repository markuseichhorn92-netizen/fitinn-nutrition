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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-50">
      {/* Desktop Navigation */}
      <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">FI</span>
          </div>
          <span className="font-bold text-xl text-gray-900">FIT-INN Nutrition</span>
        </div>
        <a 
          href="https://fitinn-trier.de" 
          className="text-teal-600 hover:text-teal-700 font-medium transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Zur FIT-INN Website →
        </a>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Side - Hero (Desktop) / Logo + Benefits (Mobile) */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:py-0 lg:px-16">
          {/* Logo */}
          <div className="mb-8 lg:mb-12">
            <div className="w-24 h-24 lg:w-32 lg:h-32 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-4xl lg:text-5xl font-black text-white">FI</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-4 text-gray-900">
            <span className="text-teal-600">FIT-INN</span> Nutrition
          </h1>
          <p className="text-gray-500 text-center text-lg lg:text-xl mb-8 max-w-lg">
            Dein persönlicher Ernährungsplan – abgestimmt auf deine Ziele
          </p>

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-4 mb-10 w-full max-w-md lg:max-w-lg">
            {[
              { icon: '🎯', text: 'Personalisiert', desc: 'Auf dich zugeschnitten' },
              { icon: '📊', text: 'Kalorienziele', desc: 'Präzise berechnet' },
              { icon: '🥗', text: '500+ Rezepte', desc: 'Abwechslungsreich' },
              { icon: '🛒', text: 'Einkaufsliste', desc: 'Automatisch generiert' },
            ].map((benefit, i) => (
              <div key={i} className="bg-white rounded-xl p-4 lg:p-5 text-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-2xl lg:text-3xl mb-2 block">{benefit.icon}</span>
                <span className="text-sm lg:text-base text-gray-900 font-semibold block">{benefit.text}</span>
                <span className="text-xs lg:text-sm text-gray-500 hidden lg:block">{benefit.desc}</span>
              </div>
            ))}
          </div>

          {/* Mobile Only: Login Form */}
          <div className="lg:hidden w-full max-w-md">
            <form onSubmit={handleLogin} className="space-y-4">
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
        </div>

        {/* Right Side - Login Form (Desktop Only) */}
        <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] bg-white border-l border-gray-100 items-center justify-center p-12">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Willkommen zurück</h2>
            <p className="text-gray-500 mb-8">Melde dich an, um deinen Ernährungsplan zu sehen.</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail Adresse
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none text-gray-900 placeholder-gray-400 transition-all"
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
                  className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="z.B. M-12345"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-lg shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

            <div className="mt-8 pt-8 border-t border-gray-100">
              <p className="text-gray-500 text-sm text-center">
                Noch kein Mitglied?{' '}
                <a href="https://fitinn-trier.de" className="text-teal-600 hover:underline font-medium">
                  Jetzt bei FIT-INN anmelden →
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 text-center text-gray-400 text-sm bg-white border-t border-gray-100">
        <p>© 2026 FIT-INN Trier • Ernährungsplan powered by AI</p>
      </footer>
    </div>
  );
}
