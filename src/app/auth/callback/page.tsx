'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

function AuthCallbackContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError('Supabase nicht konfiguriert');
        setStatus('error');
        return;
      }

      // Get the full URL including hash
      const fullUrl = window.location.href;
      const hash = window.location.hash;
      
      console.log('Auth callback - Full URL:', fullUrl);
      console.log('Auth callback - Hash:', hash);
      setDebugInfo(`URL: ${fullUrl.substring(0, 100)}...`);

      // Check for error in URL
      if (hash.includes('error=')) {
        const params = new URLSearchParams(hash.replace('#', ''));
        const errorMsg = params.get('error_description') || params.get('error') || 'Unbekannter Fehler';
        setError(decodeURIComponent(errorMsg));
        setStatus('error');
        return;
      }

      // Try to extract tokens from hash
      if (hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.replace('#', ''));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        console.log('Tokens found in URL, setting session...');
        setDebugInfo('Tokens gefunden, setze Session...');

        if (accessToken && refreshToken) {
          try {
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('Error setting session:', sessionError);
              setError(sessionError.message);
              setStatus('error');
              return;
            }

            if (data.session) {
              console.log('Session set successfully!', data.session.user?.email);
              setDebugInfo(`Eingeloggt als: ${data.session.user?.email}`);
              setStatus('success');
              
              // Clear the hash from URL
              window.history.replaceState(null, '', window.location.pathname);
              
              // Redirect after short delay
              setTimeout(() => {
                window.location.href = '/plan';
              }, 1500);
              return;
            }
          } catch (err: any) {
            console.error('Exception setting session:', err);
            setError(err.message || 'Fehler beim Setzen der Session');
            setStatus('error');
            return;
          }
        }
      }

      // No tokens in hash - check if already logged in
      console.log('No tokens in URL, checking existing session...');
      setDebugInfo('Prüfe bestehende Session...');
      
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        console.log('Already logged in!', data.session.user?.email);
        setDebugInfo(`Bereits eingeloggt: ${data.session.user?.email}`);
        setStatus('success');
        setTimeout(() => {
          window.location.href = '/plan';
        }, 1000);
        return;
      }

      // No session found
      setError('Keine Anmeldedaten gefunden. Bitte erneut versuchen.');
      setStatus('error');
    };

    // Small delay to ensure page is fully loaded
    setTimeout(handleAuth, 100);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-50 to-white p-6">
      <div className="text-center max-w-sm">
        {status === 'loading' && (
          <>
            <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Anmeldung wird verarbeitet...</h1>
            <p className="text-gray-500 text-sm">{debugInfo || 'Einen Moment bitte'}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Erfolgreich angemeldet!</h1>
            <p className="text-gray-500 mb-4">{debugInfo}</p>
            <p className="text-sm text-gray-400">Weiterleitung...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Anmeldung fehlgeschlagen</h1>
            <p className="text-red-500 mb-2">{error}</p>
            {debugInfo && <p className="text-xs text-gray-400 mb-4 break-all">{debugInfo}</p>}
            
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/login'}
                className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors w-full"
              >
                Nochmal versuchen
              </button>
              
              <button
                onClick={() => window.location.href = '/plan'}
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
