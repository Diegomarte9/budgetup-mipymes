import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Database, Server } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Health Check',
  description: 'Estado del sistema BudgetUp',
};

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HealthPage() {
  // Get basic system information
  const systemInfo = {
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    nextVersion: process.env.npm_package_dependencies_next || 'unknown',
    uptime: process.uptime(),
  };

  // Check if we can connect to the API
  let apiStatus = 'unknown';
  let dbStatus = 'unknown';
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/health`, {
      cache: 'no-store',
    });
    
    if (response.ok) {
      const data = await response.json();
      apiStatus = data.status;
      dbStatus = data.database?.status || 'unknown';
    }
  } catch (error) {
    console.error('Health check API error:', error);
    apiStatus = 'error';
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Saludable</Badge>;
      case 'error':
        return <Badge variant="destructive"><Server className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Desconocido</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Estado del Sistema</h1>
          <p className="text-muted-foreground">
            Información de salud y estado de BudgetUp para MiPymes
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Información del Sistema
              </CardTitle>
              <CardDescription>
                Detalles básicos del servidor y aplicación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Versión:</span>
                <span className="text-sm text-muted-foreground">{systemInfo.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Entorno:</span>
                <Badge variant={systemInfo.environment === 'production' ? 'default' : 'secondary'}>
                  {systemInfo.environment}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Next.js:</span>
                <span className="text-sm text-muted-foreground">{systemInfo.nextVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Tiempo activo:</span>
                <span className="text-sm text-muted-foreground">{formatUptime(systemInfo.uptime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Timestamp:</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(systemInfo.timestamp).toLocaleString('es-DO')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Service Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Estado de Servicios
              </CardTitle>
              <CardDescription>
                Estado de los servicios críticos del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">API:</span>
                {getStatusBadge(apiStatus)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Database className="w-4 h-4" />
                  Base de Datos:
                </span>
                {getStatusBadge(dbStatus)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
            <CardDescription>
              Detalles técnicos y configuración del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Región:</span>
                <span className="text-sm text-muted-foreground">República Dominicana (es-DO)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Moneda:</span>
                <span className="text-sm text-muted-foreground">Peso Dominicano (DOP)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Zona Horaria:</span>
                <span className="text-sm text-muted-foreground">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Impuesto:</span>
                <span className="text-sm text-muted-foreground">ITBIS (18%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}