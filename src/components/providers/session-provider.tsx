'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';

interface SessionContextType {
  user: User | null;
  loading: boolean;
  initialized: boolean;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  initialized: false,
});

export function useSession() {
  return useContext(SessionContext);
}

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setUser(session?.user ?? null);
          setLoading(false);
          setInitialized(true);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state change:', event, 'Current path:', pathname);
        
        setUser(session?.user ?? null);
        setLoading(false);
        setInitialized(true);

        // Only handle redirects for specific events and avoid redirecting if user is already on the right page
        if (event === 'SIGNED_IN') {
          // Only redirect if user is on auth pages
          if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register')) {
            router.push('/dashboard');
          }
        } else if (event === 'SIGNED_OUT') {
          // Only redirect if user is not on auth pages
          if (!pathname.startsWith('/auth/')) {
            router.push('/auth/login');
          }
        }
        
        // Don't redirect on TOKEN_REFRESHED or other events that happen during normal usage
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, pathname, supabase.auth]);

  return (
    <SessionContext.Provider value={{ user, loading, initialized }}>
      {children}
    </SessionContext.Provider>
  );
}