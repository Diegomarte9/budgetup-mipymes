'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useUserPreferences } from '@/stores/user-preferences';

interface MobileOptimizedLayoutProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  full: 'max-w-none',
};

const paddingClasses = {
  none: '',
  sm: 'px-4 sm:px-6',
  md: 'px-4 sm:px-6 lg:px-8',
  lg: 'px-4 sm:px-6 lg:px-8 xl:px-12',
};

const spacingClasses = {
  none: '',
  sm: 'space-y-4',
  md: 'space-y-6',
  lg: 'space-y-8',
};

export function MobileOptimizedLayout({
  children,
  className,
  maxWidth = 'xl',
  padding = 'md',
  spacing = 'md',
}: MobileOptimizedLayoutProps) {
  const { compactMode } = useUserPreferences();

  return (
    <div
      className={cn(
        'w-full mx-auto',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        spacingClasses[spacing],
        compactMode && 'space-y-4',
        className
      )}
    >
      {children}
    </div>
  );
}

// Specialized layouts for common use cases
export function DashboardLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MobileOptimizedLayout
      maxWidth="full"
      padding="none"
      spacing="md"
      className={className}
    >
      {children}
    </MobileOptimizedLayout>
  );
}

export function FormLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MobileOptimizedLayout
      maxWidth="md"
      padding="md"
      spacing="md"
      className={className}
    >
      {children}
    </MobileOptimizedLayout>
  );
}

export function ListLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MobileOptimizedLayout
      maxWidth="xl"
      padding="md"
      spacing="md"
      className={className}
    >
      {children}
    </MobileOptimizedLayout>
  );
}