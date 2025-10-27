'use client';

import { Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OnboardingChoiceProps {
  onChoice: (choice: 'create' | 'join') => void;
}

export function OnboardingChoice({ onChoice }: OnboardingChoiceProps) {
  return (
    <Card className="w-full bg-transparent border-none shadow-none">
      <CardHeader className="space-y-1 pb-6 px-6">
        <CardTitle className="text-2xl font-bold text-center text-white">
          ¡Bienvenido a BudgetUp!
        </CardTitle>
        <CardDescription className="text-center text-slate-300">
          Para comenzar, elige una de las siguientes opciones
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6">
        <div className="grid gap-4">
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-center space-y-2 bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 hover:border-gray-500 text-white transition-all duration-200"
            onClick={() => onChoice('create')}
          >
            <Building2 className="h-6 w-6 text-red-400" />
            <div className="text-center">
              <div className="font-semibold text-sm">Crear Nueva Organización</div>
              <div className="text-xs text-slate-400 mt-1">
                Configura tu empresa y comienza a gestionar tus finanzas
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-center space-y-2 bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 hover:border-gray-500 text-white transition-all duration-200"
            onClick={() => onChoice('join')}
          >
            <Users className="h-6 w-6 text-blue-400" />
            <div className="text-center">
              <div className="font-semibold text-sm">Unirse a Organización</div>
              <div className="text-xs text-slate-400 mt-1">
                Únete a una empresa existente con un código de invitación
              </div>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}