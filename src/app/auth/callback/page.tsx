'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase nicht konfiguriert');
        }

        // Debug: Log URL info
        const urlInfo = {
          href: window.location.href,
          hash: window.location.hash,
          search: window.location.search,
          code: searchParams.get('code'),
        };
        console.log('Auth callback URL info:', urlInfo);
        setDebugInfo(JSON.stringify(urlInfo, null, 2));

        // Check if we have hash params (OAuth implicit flow)
        if (window.location.hash && window.location.hash.includes('access_token')) {
          console.log('Found access_token in hash, letting Supabase handle it...');
          // Supabase client should auto-detect this
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Get the session
        const { data, error: sessionError } = await supabase.auth.getSession();
        console.log('Session check:', { session: !!data.session, error: sessionError });
        
        if (sessionError) {
          throw sessionError;
        }

        if (data.session) {
          console.log('Session found! User:', data.session.user.email);
          setStatus('success');
          
          // Try to close Capacitor browser if in native app
          try {
            const { Browser } = await import('@capacitor/browser');
            await Browser.close();
          } catch (e) {
            console.log('Not in native app or browser close failed');
          }
          
          setTimeout(() => {
            router.push('/plan');
          }, 1000);
          return;
        }

        // No session yet, try code exchange
        const code = searchParams.get('code');
        console.log('No session, checking for code:', code);
        
        if (code) {
          console.log('Exchanging code for session...');
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Code exchange failed:', exchangeError);
            throw exchangeError;
          }
          
          console.log('Code exchange successful!', exchangeData.session?.user.email);
          setStatus('success');
          
          // Try to close Capacitor browser
          try {
            const { Browser } = await import('@capacitor/browser');
            await Browser.close();
          } catch (e) {
            console.log('Browser close skipped');
          }
          
          setTimeout(() => {
            router.push('/plan');
          }, 1000);
        } else {
          // No code and no session - maybe hash params?
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          
          if (accessToken) {
            console.log('Found access_token in hash, setting session...');
            const { data: sessionData, error: setError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get('refresh_token') || '',
            });
            
            if (setError) throw setError;
            if (sessionData.session) {
              setStatus('success');
              setTimeout(() => router.push('/plan'), 1000);
              return;
            }
          }
          
          throw new Error('Keine Authentifizierungsdaten gefunden');
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message);
        setStatus('error');
      }
    };

    // Small delay to ensure URL is fully loaded
    setTimeout(handleCallback, 500);
  }, [router, searchParams]);

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
              onClick={() => router.push('/plan')}
              className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors mb-4 w-full"
            >
              Zum Ernährungsplan →
            </button>

            <div className="mt-4 p-4 bg-amber-50 rounded-xl">
              <p className="text-amber-800 text-sm font-medium mb-2">📱 App-Nutzer?</p>
              <p className="text-amber-700 text-xs">
                Schließe dieses Fenster und gehe zurück zur App.
              </p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Anmeldung fehlgeschlagen</h1>
            <p className="text-red-500 mb-4">{error}</p>
            
            {/* Debug info */}
            {debugInfo && (
              <details className="text-left mb-4">
                <summary className="text-xs text-gray-400 cursor-pointer">Debug Info</summary>
                <pre className="text-[10px] bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-32">
                  {debugInfo}
                </pre>
              </details>
            )}
            
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors w-full"
            >
              Zurück zur Startseite
            </button>
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
