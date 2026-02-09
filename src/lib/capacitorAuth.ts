import { getSupabaseClient } from './supabase';

// Check if running in Capacitor native app
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

// Check if a Capacitor plugin is available
async function isPluginAvailable(pluginName: string): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isPluginAvailable(pluginName);
  } catch {
    return false;
  }
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
    // Check if Browser plugin is available
    const browserAvailable = await isPluginAvailable('Browser');
    
    if (browserAvailable) {
      try {
        const { Browser } = await import('@capacitor/browser');
        
        // Check if App plugin is available for state change listener
        const appAvailable = await isPluginAvailable('App');
        
        if (appAvailable) {
          try {
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
          } catch (e) {
            console.warn('App plugin not available, skipping state listener:', e);
          }
        }

        // Open the OAuth URL in the in-app browser
        await Browser.open({ 
          url: data.url,
          presentationStyle: 'popover',
        });
      } catch (e) {
        console.error('Browser plugin error:', e);
        // Fallback: open in system browser
        window.open(data.url, '_blank');
      }
    } else {
      // Fallback: open in system browser
      window.open(data.url, '_blank');
    }
  } else {
    // Web: just redirect
    window.location.href = data.url;
  }
}

// Alternative: Handle OAuth with URL listener (setup on app start)
export async function setupOAuthListener(): Promise<void> {
  if (!isNativeApp()) return;

  const appAvailable = await isPluginAvailable('App');
  if (!appAvailable) {
    console.warn('App plugin not available, OAuth deep link listener not set up');
    return;
  }

  try {
    const { App } = await import('@capacitor/app');
    
    // Listen for deep links / URL opens
    App.addListener('appUrlOpen', async ({ url }) => {
      // Check if this is our OAuth callback
      if (url.includes('/auth/callback') || url.includes('access_token')) {
        const supabase = getSupabaseClient();
        if (supabase) {
          // Try to get session from URL
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            window.location.href = '/plan';
          }
        }
      }
    });
  } catch (e) {
    console.warn('Failed to setup OAuth listener:', e);
  }
}
