'use client';

import { useHydration } from '@/hooks/useHydration';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HydrationSafeDropdownProps {
  children: React.ReactNode;
}

export function HydrationSafeDropdownMenu({ children }: HydrationSafeDropdownProps) {
  const isHydrated = useHydration();
  
  if (!isHydrated) {
    return null;
  }
  
  return <DropdownMenu>{children}</DropdownMenu>;
}

export {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';