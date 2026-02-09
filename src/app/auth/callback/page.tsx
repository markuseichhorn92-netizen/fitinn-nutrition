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

        console.log('Auth callback - processing...');
        
        // Wait for Supabase to detect session from URL
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get the session
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (data?.session) {
          console.log('Login successful!');
          setStatus('success');
          
          // Check if we came from native app (check for Capacitor in user agent or referrer)
          const isFromApp = typeof window !== 'undefined' && (
            navigator.userAgent.includes('Capacitor') ||
            window.location.href.includes('capacitor') ||
            document.referrer.includes('capacitor')
          );
          
          if (isFromApp) {
            // Try to redirect back to app using custom URL scheme
            const accessToken = data.session.access_token;
            const refreshToken = data.session.refresh_token;
            const deepLink = `naehrkraft://auth/callback?access_token=${accessToken}&refresh_token=${refreshToken}`;
            
            console.log('Redirecting to app via deep link...');
            window.location.href = deepLink;
            
            // Fallback after 2 seconds if deep link didn't work
            setTimeout(() => {
              window.location.href = '/plan';
            }, 2000);
          } else {
            // Web browser - just redirect
            setTimeout(() => {
              window.location.href = '/plan';
            }, 1000);
          }
          return;
        }

        throw new Error('Login fehlgeschlagen - keine Session');
        
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Unbekannter Fehler');
        setStatus('error');
      }
    };

    handleCallback();
  }, [router]);

  // Function to manually open app
  const openApp = () => {
    window.location.href = 'naehrkraft://plan';
  };

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
            
            {/* Button to open app */}
            <button
              onClick={openApp}
              className="px-6 py-4 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors mb-4 w-full text-lg"
            >
              📱 Zurück zur App
            </button>
            
            <p className="text-gray-400 text-sm mb-4">— oder —</p>
            
            <button
              onClick={() => window.location.href = '/plan'}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium w-full"
            >
              Im Browser weitermachen
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
