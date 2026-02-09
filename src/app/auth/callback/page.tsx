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

        // FIRST: Check for hash params (OAuth implicit flow) - this is the most common case
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        console.log('Hash params:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken,
          hash: window.location.hash.substring(0, 100) + '...'
        });
        
        if (accessToken && refreshToken) {
          console.log('Setting session from hash tokens...');
          const { data: sessionData, error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          console.log('setSession result:', { 
            success: !!sessionData?.session, 
            error: setError?.message,
            user: sessionData?.session?.user?.email 
          });
          
          if (setError) {
            throw setError;
          }
          
          if (sessionData?.session) {
            console.log('Session created successfully!');
            setStatus('success');
            
            // Try to close Capacitor browser
            try {
              const { Browser } = await import('@capacitor/browser');
              await Browser.close();
            } catch (e) {
              console.log('Not in native app');
            }
            
            setTimeout(() => {
              window.location.href = '/plan';
            }, 1000);
            return;
          }
        }

        // Fallback: Check existing session
        const { data, error: sessionError } = await supabase.auth.getSession();
        console.log('Existing session check:', { session: !!data.session, error: sessionError });
        
        if (data.session) {
          console.log('Existing session found!');
          setStatus('success');
          setTimeout(() => {
            window.location.href = '/plan';
          }, 1000);
          return;
        }

        // Fallback: Try code exchange (PKCE flow)
        const code = searchParams.get('code');
        if (code) {
          console.log('Exchanging code for session...');
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            throw exchangeError;
          }
          
          if (exchangeData.session) {
            setStatus('success');
            setTimeout(() => {
              window.location.href = '/plan';
            }, 1000);
            return;
          }
        }
        
        throw new Error('Keine Authentifizierungsdaten gefunden');
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
