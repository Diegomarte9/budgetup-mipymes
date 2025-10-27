'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, User, LogOut, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Configuración</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Información de Usuario</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm">{user?.email}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">ID de Usuario</label>
              <p className="text-xs font-mono bg-muted p-2 rounded">{user?.id}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado de Verificación</label>
              <div className="mt-1">
                <Badge variant={user?.email_confirmed_at ? 'default' : 'secondary'}>
                  {user?.email_confirmed_at ? 'Verificado' : 'Pendiente de verificación'}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha de Registro</label>
              <p className="text-sm">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'No disponible'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones de Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Cerrar Sesión</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Cierra tu sesión actual en este dispositivo.
              </p>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2 text-destructive">Zona de Peligro</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Estas acciones son permanentes y no se pueden deshacer.
              </p>
              <Button 
                variant="destructive" 
                disabled
                className="w-full"
              >
                Eliminar Cuenta (Próximamente)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración Adicional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Más opciones próximamente</h3>
            <p className="text-muted-foreground">
              Estamos trabajando en más opciones de configuración para mejorar tu experiencia.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}