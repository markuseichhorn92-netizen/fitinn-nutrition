import { getSupabaseClient } from './supabase';

// Check if running in Capacitor native app
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

// Open OAuth - ALWAYS use redirect (not separate browser)
// This ensures session cookies are shared with the WebView
export async function openOAuthInBrowser(provider: 'google' | 'apple'): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase nicht konfiguriert');
  }

  // Get the OAuth URL from Supabase
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      // DON'T skip browser redirect - let it happen in the WebView
      skipBrowserRedirect: false,
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  
  // The signInWithOAuth with skipBrowserRedirect: false 
  // will automatically redirect, but just in case:
  if (data.url) {
    window.location.href = data.url;
  }
}

// Alternative function that returns URL instead of redirecting
export async function getOAuthUrl(provider: 'google' | 'apple'): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      skipBrowserRedirect: true,
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error || !data.url) return null;
  return data.url;
}
