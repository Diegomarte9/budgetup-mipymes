import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthCodeErrorPage() {
  return (
    <Card className="w-full max-w-md bg-transparent border-none shadow-none">
      <CardHeader className="space-y-1 text-center pb-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 border border-red-500/30">
          <AlertCircle className="h-6 w-6 text-red-400" />
        </div>
        <CardTitle className="text-2xl font-bold text-white">
          Error de Autenticación
        </CardTitle>
        <CardDescription className="text-slate-300">
          Hubo un problema al procesar tu solicitud de autenticación
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-red-900/20 border border-red-700/30 p-4">
          <p className="text-sm text-red-300">
            El enlace de autenticación puede haber expirado o ser inválido.
            Por favor, intenta nuevamente.
          </p>
        </div>

        <div className="space-y-2">
          <Link href="/auth/login" className="block">
            <Button className="w-full">
              Ir al Inicio de Sesión
            </Button>
          </Link>
          <Link href="/auth/register" className="block">
            <Button variant="outline" className="w-full">
              Crear Nueva Cuenta
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}