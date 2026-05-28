'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { getQueryClient } from '@/lib/query-client';
import { AuthProvider } from '@/contexts/auth-context';
import { RealtimeProvider } from '@/components/RealtimeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange storageKey="goldtracker-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RealtimeProvider>
            {children}
          </RealtimeProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
