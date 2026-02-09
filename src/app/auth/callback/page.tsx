'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';

// Storage key must match what's in supabase.ts
const STORAGE_KEY = 'fitinn-auth';

function AuthCallbackContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Initialisiere...');

  useEffect(() => {
    const handleAuth = async () => {
      const url = window.location.href;
      const hash = window.location.hash;
      console.log('Auth callback - Full URL:', url);
      console.log('Auth callback - Hash:', hash);

      // Parse hash parameters
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const expiresIn = hashParams.get('expires_in');
      const tokenType = hashParams.get('token_type');
      const errorParam = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      setDebugInfo(accessToken ? 'Tokens gefunden...' : 'Keine Tokens in URL');

      // If there's an error in the URL
      if (errorParam) {
        console.error('OAuth error:', errorParam, errorDescription);
        setError(errorDescription || errorParam);
        setStatus('error');
        return;
      }

      // If we have tokens, store them directly in localStorage
      if (accessToken && refreshToken) {
        console.log('Found tokens, storing directly in localStorage...');
        setDebugInfo('Speichere Session...');
        
        try {
          // Decode the JWT to get user info and expiry
          const tokenParts = accessToken.split('.');
          if (tokenParts.length !== 3) {
            throw new Error('Invalid token format');
          }
          
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('Token payload:', payload);
          
          // Calculate expiry
          const expiresAt = payload.exp || (Math.floor(Date.now() / 1000) + parseInt(expiresIn || '3600'));
          
          // Construct session object matching Supabase's format
          const session = {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: parseInt(expiresIn || '3600'),
            expires_at: expiresAt,
            token_type: tokenType || 'bearer',
            user: {
              id: payload.sub,
              email: payload.email,
              app_metadata: payload.app_metadata || {},
              user_metadata: payload.user_metadata || {},
              aud: payload.aud,
              created_at: payload.created_at || new Date().toISOString(),
            }
          };
          
          // Store in localStorage with Supabase's expected format
          const storageValue = JSON.stringify(session);
          localStorage.setItem(STORAGE_KEY, storageValue);
          
          console.log('Session stored successfully!');
          setDebugInfo(`Eingeloggt als ${payload.email}`);
          setStatus('success');
          
          // Clear the hash from URL
          window.history.replaceState(null, '', '/auth/callback');
          
          // Redirect to plan (full page reload to pick up new session)
          setTimeout(() => {
            window.location.href = '/plan';
          }, 1500);
          
        } catch (err: any) {
          console.error('Error processing tokens:', err);
          setError(err.message || 'Fehler beim Verarbeiten der Tokens');
          setStatus('error');
        }
        return;
      }

      // No tokens - check if already have a session in storage
      const existingSession = localStorage.getItem(STORAGE_KEY);
      if (existingSession) {
        try {
          const session = JSON.parse(existingSession);
          if (session.access_token && session.expires_at > Date.now() / 1000) {
            console.log('Found existing valid session');
            setDebugInfo(`Bereits eingeloggt: ${session.user?.email}`);
            setStatus('success');
            setTimeout(() => {
              window.location.href = '/plan';
            }, 1000);
            return;
          }
        } catch (e) {
          console.error('Error parsing existing session:', e);
        }
      }

      // No session found
      setError('Keine Anmeldedaten gefunden');
      setDebugInfo('URL: ' + url.substring(0, 80) + '...');
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
            <p className="text-xs text-gray-400 mb-6 break-all">{debugInfo}</p>
            
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
