'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

function AuthCallbackContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Initialisiere...');

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError('Supabase nicht konfiguriert');
        setStatus('error');
        return;
      }

      const url = window.location.href;
      const hash = window.location.hash;
      console.log('Auth callback - Full URL:', url);
      console.log('Auth callback - Hash:', hash);

      // Parse hash parameters
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const errorParam = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      // Debug info
      setDebugInfo(accessToken ? 'Token gefunden...' : 'Prüfe Session...');

      // If there's an error in the URL
      if (errorParam) {
        console.error('OAuth error:', errorParam, errorDescription);
        setError(errorDescription || errorParam);
        setStatus('error');
        return;
      }

      // If we have tokens in the hash, manually set the session
      if (accessToken && refreshToken) {
        console.log('Found tokens in URL hash, setting session...');
        setDebugInfo('Setze Session...');
        
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
            setDebugInfo(`Eingeloggt als ${data.session.user?.email}`);
            setStatus('success');
            
            // Clear hash from URL for cleaner look
            window.history.replaceState(null, '', '/auth/callback');
            
            // Redirect to plan
            setTimeout(() => {
              window.location.href = '/plan';
            }, 1500);
            return;
          }
        } catch (err: any) {
          console.error('Exception setting session:', err);
          setError(err.message || 'Unbekannter Fehler');
          setStatus('error');
          return;
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
            <p className="text-gray-500 text-sm">{debugInfo}</p>
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
            <p className="text-xs text-gray-400 mb-6">{debugInfo}</p>
            
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
