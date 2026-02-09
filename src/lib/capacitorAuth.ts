import { getSupabaseClient } from './supabase';

// Check if running in Capacitor native app
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

// Open OAuth in Capacitor Browser (for native apps)
export async function openOAuthInBrowser(provider: 'google' | 'apple'): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase nicht konfiguriert');
  }

  // Get the OAuth URL from Supabase
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      skipBrowserRedirect: true,
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('Keine OAuth URL erhalten');

  if (isNativeApp()) {
    // Use Capacitor Browser for native apps
    const { Browser } = await import('@capacitor/browser');
    
    // Listen for the app to come back into focus
    const { App } = await import('@capacitor/app');
    
    // Add listener for when app resumes (user comes back from browser)
    const resumeListener = await App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        // Check if we have a session now
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          // We're logged in! Close the browser and navigate
          await Browser.close();
          window.location.href = '/plan';
        }
        // Remove listener after handling
        resumeListener.remove();
      }
    });

    // Open the OAuth URL in the in-app browser
    await Browser.open({ 
      url: data.url,
      presentationStyle: 'popover',
    });
  } else {
    // Web: just redirect
    window.location.href = data.url;
  }
}

// Alternative: Handle OAuth with URL listener
export async function setupOAuthListener(): Promise<void> {
  if (!isNativeApp()) return;

  const { App } = await import('@capacitor/app');
  
  // Listen for deep links / URL opens
  App.addListener('appUrlOpen', async ({ url }) => {
    // Check if this is our OAuth callback
    if (url.includes('/auth/callback') || url.includes('access_token')) {
      const supabase = getSupabaseClient();
      if (supabase) {
        // Try to get session from URL
        const { data, error } = await supabase.auth.getSession();
        if (data.session) {
          window.location.href = '/plan';
        }
      }
    }
  });
}
