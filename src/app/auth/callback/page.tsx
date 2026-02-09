'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase nicht konfiguriert');
        }

        console.log('Auth callback started, URL:', window.location.href.substring(0, 100));
        
        // Wait a moment for Supabase to detect the session from URL
        // detectSessionInUrl: true should handle this automatically
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get the session - Supabase should have parsed the hash automatically
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        console.log('Session result:', { 
          hasSession: !!data?.session, 
          error: sessionError?.message,
          user: data?.session?.user?.email 
        });
        
        if (sessionError) {
          throw sessionError;
        }

        if (data?.session) {
          console.log('Login successful!');
          setStatus('success');
          
          // Redirect after short delay
          setTimeout(() => {
            window.location.href = '/plan';
          }, 1500);
          return;
        }

        // No session found - something went wrong
        throw new Error('Login fehlgeschlagen - keine Session erstellt');
        
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Unbekannter Fehler');
        setStatus('error');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-50 to-white p-6">
      <div className="text-center max-w-sm">
        {status === 'loading' && (
          <>
            <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Anmeldung wird verarbeitet...</h1>
            <p className="text-gray-500">Einen Moment bitte</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Erfolgreich angemeldet!</h1>
            <p className="text-gray-500 mb-4">Du wirst weitergeleitet...</p>
            
            <button
              onClick={() => window.location.href = '/plan'}
              className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors mb-4 w-full"
            >
              Zum Ernährungsplan →
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Anmeldung fehlgeschlagen</h1>
            <p className="text-red-500 mb-6">{error}</p>
            
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors w-full"
              >
                Nochmal versuchen
              </button>
              
              <button
                onClick={() => window.location.href = '/onboarding'}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium w-full"
              >
                Ohne Anmeldung starten
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-50 to-white">
        <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
