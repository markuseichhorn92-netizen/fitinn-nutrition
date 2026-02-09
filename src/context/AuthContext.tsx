'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { syncLocalDataToSupabase, syncSupabaseToLocal } from '@/lib/supabase-data';
import { syncFromCloud } from '@/lib/storage';

// Setup deep link listener for OAuth callback
async function setupDeepLinkListener(supabase: any) {
  if (typeof window === 'undefined') return;
  
  // Check if Capacitor is available
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
  if (!isNative) return;
  
  try {
    const { App } = await import('@capacitor/app');
    
    // Listen for app URL open events
    App.addListener('appUrlOpen', async ({ url }) => {
      console.log('Deep link received:', url);
      
      if (url.includes('naehrkraft://auth/callback') || url.includes('access_token')) {
        // Parse tokens from URL
        const urlObj = new URL(url.replace('naehrkraft://', 'https://'));
        const accessToken = urlObj.searchParams.get('access_token');
        const refreshToken = urlObj.searchParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          console.log('Setting session from deep link...');
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (!error) {
            console.log('Session set successfully!');
            window.location.href = '/plan';
          } else {
            console.error('Error setting session:', error);
          }
        }
      }
    });
    
    console.log('Deep link listener registered');
  } catch (e) {
    console.warn('Could not setup deep link listener:', e);
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isConfigured: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);

    if (!configured) {
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Setup deep link listener for OAuth
    setupDeepLinkListener(supabase);
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Sync data after login
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in, syncing data...');
          // First push local data to cloud
          await syncLocalDataToSupabase();
          // Then pull cloud data to local (to get data from other devices)
          await syncFromCloud();
          console.log('Data sync complete!');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { error: new Error('Supabase nicht konfiguriert') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { error: new Error('Supabase nicht konfiguriert') };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const value = {
    user,
    session,
    isLoading,
    isConfigured,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
