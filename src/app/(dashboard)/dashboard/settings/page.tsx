'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { MobileButton } from '@/components/ui/mobile-button';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageLoadingSkeleton } from '@/components/ui/skeleton-loaders';
import { Settings, User, LogOut, Loader2, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();

  const [isExporting, setIsExporting] = useState(false);

  const handleExcelExport = async () => {
    try {
      setIsExporting(true);
      let orgId: string | null = null;
      try {
        orgId = localStorage.getItem('currentOrganizationId');
      } catch {
        // ignore storage errors; API falls back to the user's first organization
      }
      const params = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : '';
      const response = await fetch(`/api/export/excel${params}`);

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Error al generar el archivo Excel');
      }

      const filename =
        response.headers.get('X-Filename') ||
        `budgetup_${new Date().toISOString().split('T')[0]}.xlsx`;
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Excel descargado correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al exportar a Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Configuración' }
  ];

  if (authLoading) {
    return <PageLoadingSkeleton />;
  }

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Configuración"
        description="Administra tu cuenta y preferencias"
        breadcrumbs={breadcrumbs}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Information */}
        <Card className="dark-mode-transition">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-responsive-base">
              <User className="h-5 w-5" />
              <span>Información de Usuario</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-responsive-xs font-medium text-muted-foreground">Email</label>
              <p className="text-responsive-sm">{user?.email}</p>
            </div>
            
            <div>
              <label className="text-responsive-xs font-medium text-muted-foreground">ID de Usuario</label>
              <p className="text-xs font-mono bg-muted p-2 rounded break-all">{user?.id}</p>
            </div>

            <div>
              <label className="text-responsive-xs font-medium text-muted-foreground">Estado de Verificación</label>
              <div className="mt-1">
                <Badge variant={user?.email_confirmed_at ? 'default' : 'secondary'} className="text-responsive-xs">
                  {user?.email_confirmed_at ? 'Verificado' : 'Pendiente de verificación'}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-responsive-xs font-medium text-muted-foreground">Fecha de Registro</label>
              <p className="text-responsive-sm">
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
        <Card className="dark-mode-transition">
          <CardHeader>
            <CardTitle className="text-responsive-base">Acciones de Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 text-responsive-sm">Cerrar Sesión</h4>
              <p className="text-responsive-xs text-muted-foreground mb-3">
                Cierra tu sesión actual en este dispositivo.
              </p>
              <MobileButton 
                variant="outline" 
                onClick={handleSignOut}
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </MobileButton>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2 text-responsive-sm">Exportar Datos</h4>
              <p className="text-responsive-xs text-muted-foreground mb-3">
                Descarga un Excel con tus datos de usuario y de tu empresa: cuentas, categorías y transacciones.
              </p>
              <MobileButton
                variant="outline"
                onClick={handleExcelExport}
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                {isExporting ? 'Generando Excel...' : 'Descargar Excel'}
              </MobileButton>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2 text-destructive text-responsive-sm">Zona de Peligro</h4>
              <p className="text-responsive-xs text-muted-foreground mb-3">
                Estas acciones son permanentes y no se pueden deshacer.
              </p>
              <MobileButton 
                variant="destructive" 
                disabled
                className="w-full"
              >
                Eliminar Cuenta (Próximamente)
              </MobileButton>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Settings */}
      <Card className="dark-mode-transition">
        <CardHeader>
          <CardTitle className="text-responsive-base">Configuración Adicional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-responsive-base font-semibold mb-2">Más opciones próximamente</h3>
            <p className="text-muted-foreground text-responsive-sm">
              Estamos trabajando en más opciones de configuración para mejorar tu experiencia.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}