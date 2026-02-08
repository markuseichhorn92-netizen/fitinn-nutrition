'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    // Validation
    if (!email || !password || !confirmPassword) {
      setError('Bitte fülle alle Felder aus.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      setIsLoading(false);
      return;
    }

    const { error: signUpError } = await signUp(email, password);

    if (signUpError) {
      // Translate common errors
      if (signUpError.message.includes('User already registered')) {
        setError('Diese E-Mail-Adresse ist bereits registriert.');
      } else if (signUpError.message.includes('Invalid email')) {
        setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      } else {
        setError(signUpError.message);
      }
      setIsLoading(false);
      return;
    }

    // Show success message
    setSuccess(true);
    setIsLoading(false);
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
            <h1 className="text-2xl font-bold text-white">Konto erstellen</h1>
            <p className="text-teal-100 mt-2">Sichere deine Daten in der Cloud</p>
          </div>

          {/* Register Form */}
          <div className="bg-white rounded-3xl p-6 shadow-xl">
            {success ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Fast geschafft!</h2>
                <p className="text-gray-500 mb-6">
                  Wir haben dir eine Bestätigungs-E-Mail an <strong>{email}</strong> gesendet. 
                  Bitte bestätige deine E-Mail-Adresse, um dich anzumelden.
                </p>
                <Link
                  href="/login"
                  className="inline-block px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
                >
                  Zur Anmeldung
                </Link>
              </div>
            ) : (
              <>
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
                      placeholder="Mindestens 6 Zeichen"
                      autoComplete="new-password"
                    />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Passwort bestätigen
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-100 border-0 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
                      placeholder="Passwort wiederholen"
                      autoComplete="new-password"
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
                        <span>Registrieren...</span>
                      </>
                    ) : (
                      'Registrieren'
                    )}
                  </button>
                </form>

                {/* Login Link */}
                <div className="mt-6 text-center">
                  <p className="text-gray-500 text-sm">
                    Schon ein Konto?{' '}
                    <Link href="/login" className="text-teal-600 font-medium hover:underline">
                      Jetzt anmelden
                    </Link>
                  </p>
                </div>

                {/* Continue without account */}
                <div className="mt-4 text-center">
                  <Link href="/plan" className="text-gray-400 text-sm hover:text-gray-600 transition-colors">
                    Ohne Konto fortfahren →
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Info */}
          <div className="mt-6 text-center text-teal-100 text-sm">
            <p>Mit einem Konto werden deine Ernährungspläne, Favoriten und Fortschritte sicher gespeichert.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
