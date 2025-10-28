'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Home,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Wallet,
  Tag,
  FileText,
  Activity,
  Plus,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Transacciones',
    href: '/transactions',
    icon: Wallet,
  },
  {
    name: 'Cuentas',
    href: '/accounts',
    icon: Building2,
  },
  {
    name: 'Categorías',
    href: '/categories',
    icon: Tag,
  },
  {
    name: 'Reportes',
    href: '/reports',
    icon: FileText,
  },
  {
    name: 'Actividad',
    href: '/activity',
    icon: Activity,
  },
];

interface DashboardNavProps {
  currentOrganization?: {
    id: string;
    name: string;
  };
  organizations?: Array<{
    id: string;
    name: string;
  }>;
  onOrganizationChange?: (organizationId: string) => void;
}

export function DashboardNav({
  currentOrganization,
  organizations = [],
  onOrganizationChange,
}: DashboardNavProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { currentMembership } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
    setIsLoading(false);
  };

  return (
    <header className='supports-backdrop-filter:bg-background/60 border-b bg-background/95 backdrop-blur dark-mode-transition'>
      <div className='w-full max-w-none px-mobile py-4 sm:py-6'>
        <div className='flex items-center justify-between gap-2 sm:gap-4'>
          <div className='flex items-center space-x-2 sm:space-x-4 lg:space-x-6'>
            <Link href='/dashboard' className='text-responsive-xl font-bold text-primary hover:text-primary/80 transition-colors'>
              BudgetUp
            </Link>

            {/* Organization Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='outline'
                  className='flex items-center space-x-2 min-w-[140px] sm:min-w-[180px] lg:min-w-[200px] justify-start text-responsive-sm focus-visible-enhanced'
                >
                  <Building2 className='h-4 w-4 flex-shrink-0' />
                  <span className='truncate'>
                    {currentOrganization?.name || 'Seleccionar'}
                  </span>
                  <ChevronDown className='h-4 w-4 flex-shrink-0' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-72 p-2'>
                {organizations.length > 0 ? (
                  <>
                    {organizations.map(org => (
                      <DropdownMenuItem 
                        key={org.id} 
                        onClick={() => onOrganizationChange?.(org.id)}
                        className={cn(
                          'py-3 px-3 cursor-pointer rounded-md',
                          currentOrganization?.id === org.id ? 'bg-accent' : ''
                        )}
                      >
                        <Building2 className='mr-2 h-4 w-4' />
                        <span className='truncate'>{org.name}</span>
                        {currentOrganization?.id === org.id && (
                          <span className='ml-auto text-xs text-muted-foreground'>Actual</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                ) : (
                  <>
                    <div className='px-3 py-3 text-sm text-muted-foreground'>
                      No tienes organizaciones
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link 
                    href='/auth/onboarding' 
                    className='text-primary font-medium hover:text-primary/80 focus:text-primary/80 py-3 px-3 rounded-md'
                  >
                    <Plus className='mr-2 h-4 w-4' />
                    Crear nueva organización
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Navigation Links */}
          <nav className='hidden items-center space-x-2 lg:flex'>
            {navigation.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'flex items-center space-x-2 px-4 py-2 h-10',
                      isActive && 'bg-secondary'
                    )}
                  >
                    <Icon className='h-4 w-4' />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Theme Toggle and User Menu */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-2 h-10 focus-visible-enhanced'>
                  <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0'>
                    <span className='text-sm font-medium'>
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className='hidden text-responsive-sm lg:block truncate max-w-[120px]'>{user?.email}</span>
                  <ChevronDown className='h-4 w-4 flex-shrink-0' />
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-64 p-2'>
              {/* Only show member management for owners and admins */}
              {currentMembership && ['owner', 'admin'].includes(currentMembership.role) && (
                <DropdownMenuItem asChild>
                  <Link href='/settings/members' className='py-3 px-3 rounded-md'>
                    <Users className='mr-3 h-4 w-4' />
                    Gestión de Miembros
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href='/dashboard/settings' className='py-3 px-3 rounded-md'>
                  <Settings className='mr-3 h-4 w-4' />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut} 
                disabled={isLoading}
                className='py-3 px-3 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50'
              >
                <LogOut className='mr-3 h-4 w-4' />
                {isLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className='mt-4 sm:mt-6 flex space-x-2 overflow-x-auto lg:hidden pb-2 scrollbar-hide'>
          {navigation.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size='sm'
                  className={cn(
                    'flex items-center space-x-2 whitespace-nowrap px-3 sm:px-4 py-2 h-9 touch-target focus-visible-enhanced',
                    isActive && 'bg-secondary'
                  )}
                >
                  <Icon className='h-4 w-4 flex-shrink-0' />
                  <span className='text-responsive-xs'>{item.name}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
