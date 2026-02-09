'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { isNativeApp, openOAuthInBrowser } from '@/lib/capacitorAuth';

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect to plan
  if (user) {
    router.push('/plan');
    return null;
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await openOAuthInBrowser('google');
    } catch (err: any) {
      setError(err.message || 'Login fehlgeschlagen');
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Login nicht verfügbar');
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Ungültige E-Mail oder Passwort');
      setIsLoading(false);
    } else {
      router.push('/plan');
    }
  };

  const handleStartOnboarding = () => {
    router.push('/onboarding');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-50 via-white to-gray-50">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image 
            src="/logo.png" 
            alt="FIT-INN Logo" 
            width={40} 
            height={40} 
            className="rounded-xl"
          />
          <span className="font-bold text-lg text-gray-900 hidden sm:block">Nährkraft</span>
        </div>
        <a 
          href="https://fitinn-trier.de" 
          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          FIT-INN Website →
        </a>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            <Image 
              src="/logo.png" 
              alt="Nährkraft" 
              width={100} 
              height={100} 
              className="rounded-2xl shadow-xl"
            />
            <div className="absolute inset-0 bg-teal-500/20 blur-2xl rounded-full -z-10 scale-150" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            <span className="text-teal-600">Nährkraft</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Dein persönlicher Ernährungsplan — powered by FIT-INN Trier
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3 mb-8 w-full max-w-sm">
          {[
            { icon: '🎯', text: 'Personalisiert' },
            { icon: '📊', text: 'Kalorienziele' },
            { icon: '🥗', text: '2000+ Rezepte' },
            { icon: '📷', text: 'Barcode Scanner' },
          ].map((benefit, i) => (
            <div key={i} className="bg-white/80 backdrop-blur rounded-xl p-3 text-center border border-gray-100 shadow-sm">
              <span className="text-xl mb-1 block">{benefit.icon}</span>
              <span className="text-sm text-gray-700 font-medium">{benefit.text}</span>
            </div>
          ))}
        </div>

        {/* Main CTA - Start Onboarding */}
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={handleStartOnboarding}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold text-lg shadow-lg shadow-teal-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Jetzt starten — kostenlos 🚀
          </button>
          <p className="text-center text-sm text-gray-400">
            Erstelle deinen personalisierten Ernährungsplan in 2 Minuten
          </p>
        </div>

        {/* Divider */}
        <div className="w-full max-w-sm my-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-gradient-to-b from-white to-gray-50 text-sm text-gray-400">
                Bereits registriert?
              </span>
            </div>
          </div>
        </div>

        {/* Login Section */}
        <div className="w-full max-w-sm">
          {!showLogin ? (
            <button
              onClick={() => setShowLogin(true)}
              className="w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Anmelden
            </button>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 text-center mb-4">Anmelden</h3>
              
              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 mb-4 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium text-gray-700">Mit Google</span>
              </button>

              {/* Divider */}
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-400">oder</span>
                </div>
              </div>

              {/* Email Login Form */}
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-gray-900"
                  placeholder="E-Mail"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-gray-900"
                  placeholder="Passwort"
                  required
                />
                
                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Laden...' : 'Anmelden'}
                </button>
              </form>

              <button
                onClick={() => setShowLogin(false)}
                className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Image src="/logo.png" alt="FIT-INN" width={24} height={24} className="rounded-lg" />
          <span className="text-sm font-medium text-gray-600">Powered by FIT-INN Trier</span>
        </div>
        <p className="text-xs text-gray-400 mb-2">
          © 2026 FIT-INN Trier • Ernährungsplan powered by AI
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
          <Link href="/impressum" className="hover:text-gray-600">Impressum</Link>
          <span>•</span>
          <Link href="/datenschutz" className="hover:text-gray-600">Datenschutz</Link>
        </div>
      </footer>
    </div>
  );
}
