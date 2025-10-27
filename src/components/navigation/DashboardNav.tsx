'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
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
} from 'lucide-react';
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
    name: 'Miembros',
    href: '/dashboard/members',
    icon: Users,
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
}

export function DashboardNav({
  currentOrganization,
  organizations = [],
}: DashboardNavProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
    setIsLoading(false);
  };

  return (
    <header className='supports-backdrop-filter:bg-background/60 border-b bg-background/95 backdrop-blur'>
      <div className='container mx-auto px-4 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-6'>
            <Link href='/dashboard' className='text-2xl font-bold'>
              BudgetUp
            </Link>

            {/* Organization Selector */}
            {organizations.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='outline'
                    className='flex items-center space-x-2'
                  >
                    <Building2 className='h-4 w-4' />
                    <span>
                      {currentOrganization?.name || 'Seleccionar organización'}
                    </span>
                    <ChevronDown className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='start' className='w-56'>
                  {organizations.map(org => (
                    <DropdownMenuItem key={org.id} asChild>
                      <Link href={`/dashboard?org=${org.id}`}>
                        <Building2 className='mr-2 h-4 w-4' />
                        {org.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Navigation Links */}
          <nav className='hidden items-center space-x-1 md:flex'>
            {navigation.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'flex items-center space-x-2',
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

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='flex items-center space-x-2'>
                <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary/10'>
                  <span className='text-sm font-medium'>
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className='hidden text-sm sm:block'>{user?.email}</span>
                <ChevronDown className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuItem asChild>
                <Link href='/dashboard/settings'>
                  <Settings className='mr-2 h-4 w-4' />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} disabled={isLoading}>
                <LogOut className='mr-2 h-4 w-4' />
                {isLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Navigation */}
        <nav className='mt-4 flex space-x-1 overflow-x-auto md:hidden'>
          {navigation.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size='sm'
                  className={cn(
                    'flex items-center space-x-2 whitespace-nowrap',
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
      </div>
    </header>
  );
}
