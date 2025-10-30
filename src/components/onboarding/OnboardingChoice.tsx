'use client';

import { Building2, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingChoiceProps {
  onChoice: (choice: 'create' | 'join') => void;
}

export function OnboardingChoice({ onChoice }: OnboardingChoiceProps) {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Card className='w-full border-none bg-transparent shadow-none'>
      <CardHeader className='space-y-1 px-6 pb-6'>
        <CardTitle className='text-center text-2xl font-bold text-white'>
          ¡Bienvenido a BudgetUp!
        </CardTitle>
        <CardDescription className='text-center text-slate-300'>
          Para comenzar, elige una de las siguientes opciones
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4 px-6 pb-6'>
        <div className='grid gap-4'>
          <Button
            variant='outline'
            className='flex h-auto flex-col items-center space-y-2 border-gray-600 bg-gray-800/50 p-4 text-white transition-all duration-200 hover:border-gray-500 hover:bg-gray-700/50 hover:text-white'
            onClick={() => onChoice('create')}
          >
            <Building2 className='h-6 w-6 text-red-400' />
            <div className='text-center'>
              <div className='text-sm font-semibold text-white'>
                Crear Nueva Organización
              </div>
              <div className='mt-1 text-xs text-slate-400'>
                Configura tu empresa y comienza a gestionar tus finanzas
              </div>
            </div>
          </Button>

          <Button
            variant='outline'
            className='flex h-auto flex-col items-center space-y-2 border-gray-600 bg-gray-800/50 p-4 text-white transition-all duration-200 hover:border-gray-500 hover:bg-gray-700/50 hover:text-white'
            onClick={() => onChoice('join')}
          >
            <Users className='h-6 w-6 text-blue-400' />
            <div className='text-center'>
              <div className='text-sm font-semibold text-white'>
                Unirse a Organización
              </div>
              <div className='mt-1 text-xs text-slate-400'>
                Únete a una empresa existente con un código de invitación
              </div>
            </div>
          </Button>
        </div>

        <div className='border-t border-gray-700 pt-4'>
          <Button
            variant='ghost'
            className='w-full text-slate-400 hover:bg-gray-800/50 hover:text-white'
            onClick={handleSignOut}
          >
            <LogOut className='mr-2 h-4 w-4' />
            Cambiar de cuenta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
