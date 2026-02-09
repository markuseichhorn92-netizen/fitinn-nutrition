'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase nicht konfiguriert');
        }

        // Get the session from URL hash (for OAuth)
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (data.session) {
          setStatus('success');
          // Small delay to show success message
          setTimeout(() => {
            router.push('/plan');
          }, 1000);
        } else {
          // Try to exchange code for session
          const code = searchParams.get('code');
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              throw exchangeError;
            }
            setStatus('success');
            setTimeout(() => {
              router.push('/plan');
            }, 1000);
          } else {
            throw new Error('Keine Session gefunden');
          }
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message);
        setStatus('error');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-50 to-white p-6">
      <div className="text-center">
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
            
            {/* Button for manual redirect */}
            <button
              onClick={() => router.push('/plan')}
              className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors mb-4 w-full max-w-xs"
            >
              Zum Ernährungsplan →
            </button>

            {/* Hint for mobile app users */}
            <div className="mt-6 p-4 bg-amber-50 rounded-xl max-w-xs mx-auto">
              <p className="text-amber-800 text-sm font-medium mb-2">📱 App-Nutzer?</p>
              <p className="text-amber-700 text-xs">
                Falls du die App nutzt, gehe zurück zur App. 
                Die Anmeldung wird automatisch übernommen.
              </p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Anmeldung fehlgeschlagen</h1>
            <p className="text-red-500 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
            >
              Zurück zur Startseite
            </button>
          </>
        )}
      </div>
    </div>
  );
}
