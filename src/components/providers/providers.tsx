'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { LoadingProvider } from './loading-provider';
import { MembershipProvider } from '@/contexts/MembershipContext';
import { useState } from 'react';
import { createQueryClient } from '@/lib/react-query';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute='class'
        defaultTheme='system'
        enableSystem
        disableTransitionOnChange
      >
        <MembershipProvider>
          <LoadingProvider>
            {children}
            <Toaster 
              position='top-right' 
              expand={false} 
              richColors 
              closeButton 
              className="dark-mode-transition"
            />
          </LoadingProvider>
        </MembershipProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
