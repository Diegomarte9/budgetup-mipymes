'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  minItemWidth?: string;
}

const gapClasses = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
};

export function ResponsiveGrid({
  children,
  className,
  cols = { default: 1, sm: 2, lg: 3 },
  gap = 'md',
  minItemWidth,
}: ResponsiveGridProps) {
  const getGridCols = () => {
    const classes = [];
    
    if (cols.default) classes.push(`grid-cols-${cols.default}`);
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
    
    return classes.join(' ');
  };

  const gridStyle = minItemWidth 
    ? { gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))` }
    : undefined;

  return (
    <div
      className={cn(
        'grid',
        !minItemWidth && getGridCols(),
        gapClasses[gap],
        className
      )}
      style={gridStyle}
    >
      {children}
    </div>
  );
}

// Specialized grid components
export function CardGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ResponsiveGrid
      cols={{ default: 1, sm: 2, lg: 3 }}
      gap="md"
      className={className}
    >
      {children}
    </ResponsiveGrid>
  );
}

export function KPIGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ResponsiveGrid
      cols={{ default: 1, md: 2, lg: 3 }}
      gap="md"
      className={className}
    >
      {children}
    </ResponsiveGrid>
  );
}

export function ChartGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ResponsiveGrid
      cols={{ default: 1, lg: 2 }}
      gap="lg"
      className={className}
    >
      {children}
    </ResponsiveGrid>
  );
}

export function AutoFitGrid({ 
  children, 
  className, 
  minItemWidth = '280px' 
}: { 
  children: ReactNode; 
  className?: string; 
  minItemWidth?: string;
}) {
  return (
    <ResponsiveGrid
      minItemWidth={minItemWidth}
      gap="md"
      className={className}
    >
      {children}
    </ResponsiveGrid>
  );
}