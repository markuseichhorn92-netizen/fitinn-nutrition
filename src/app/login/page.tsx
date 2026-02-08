'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Bitte fülle alle Felder aus.');
      setIsLoading(false);
      return;
    }

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      // Translate common errors
      if (signInError.message.includes('Invalid login credentials')) {
        setError('E-Mail oder Passwort ist falsch.');
      } else if (signInError.message.includes('Email not confirmed')) {
        setError('Bitte bestätige zuerst deine E-Mail-Adresse.');
      } else {
        setError(signInError.message);
      }
      setIsLoading(false);
      return;
    }

    // Redirect to plan page on success
    router.push('/plan');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-600 to-teal-700 flex flex-col">
      {/* Header */}
      <div className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Zurück</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <Image src="/logo.png" alt="FIT-INN" width={60} height={60} className="rounded-xl" />
            </div>
            <h1 className="text-2xl font-bold text-white">Willkommen zurück!</h1>
            <p className="text-teal-100 mt-2">Melde dich an, um fortzufahren</p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 border-0 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
                  placeholder="deine@email.de"
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 border-0 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Anmelden...</span>
                  </>
                ) : (
                  'Anmelden'
                )}
              </button>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-500 text-sm">
                Noch kein Konto?{' '}
                <Link href="/register" className="text-teal-600 font-medium hover:underline">
                  Jetzt registrieren
                </Link>
              </p>
            </div>

            {/* Continue without account */}
            <div className="mt-4 text-center">
              <Link href="/plan" className="text-gray-400 text-sm hover:text-gray-600 transition-colors">
                Ohne Konto fortfahren →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
