'use client';

import { useState } from 'react';
import { useAuditLogs, formatActionName, formatTableName, getActionColor } from '@/hooks/useAuditLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, Filter, User, Calendar, Database } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditLogsListProps {
  organizationId: string;
}

export function AuditLogsList({ organizationId }: AuditLogsListProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    tableName: '',
    startDate: '',
    endDate: '',
  });

  const { data, isLoading, error } = useAuditLogs({
    organizationId,
    page,
    limit: 20,
    ...Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '')
    ),
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      tableName: '',
      startDate: '',
      endDate: '',
    });
    setPage(1);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error al cargar los registros de auditoría. Por favor, intenta de nuevo.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Acción</label>
              <Select
                value={filters.action}
                onValueChange={(value) => handleFilterChange('action', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las acciones</SelectItem>
                  <SelectItem value="create">Creado</SelectItem>
                  <SelectItem value="update">Actualizado</SelectItem>
                  <SelectItem value="delete">Eliminado</SelectItem>
                  <SelectItem value="login">Inicio de sesión</SelectItem>
                  <SelectItem value="logout">Cierre de sesión</SelectItem>
                  <SelectItem value="invite_sent">Invitación enviada</SelectItem>
                  <SelectItem value="role_changed">Rol cambiado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tabla</label>
              <Select
                value={filters.tableName}
                onValueChange={(value) => handleFilterChange('tableName', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las tablas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las tablas</SelectItem>
                  <SelectItem value="transactions">Transacciones</SelectItem>
                  <SelectItem value="accounts">Cuentas</SelectItem>
                  <SelectItem value="categories">Categorías</SelectItem>
                  <SelectItem value="organizations">Organizaciones</SelectItem>
                  <SelectItem value="memberships">Membresías</SelectItem>
                  <SelectItem value="invitations">Invitaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Fecha inicio</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Fecha fin</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Actividad Reciente
            {data && (
              <Badge variant="secondary">
                {data.pagination.total} registros
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data?.data.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron registros de auditoría</p>
              <p className="text-sm">Los registros aparecerán aquí cuando se realicen acciones</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.data.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="shrink-0">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="outline" 
                        className={getActionColor(log.action)}
                      >
                        {formatActionName(log.action)}
                      </Badge>
                      <Badge variant="secondary">
                        {formatTableName(log.table_name)}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">
                        {log.users?.email || 'Usuario desconocido'}
                      </span>
                      {' '}
                      {formatActionName(log.action).toLowerCase()} un registro en{' '}
                      {formatTableName(log.table_name).toLowerCase()}
                      {log.record_id && (
                        <span className="font-mono text-xs ml-2 bg-muted px-2 py-1 rounded">
                          ID: {log.record_id.slice(0, 8)}...
                        </span>
                      )}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(log.created_at), 'PPp', { locale: es })}
                      </div>
                    </div>

                    {/* Show changes for updates */}
                    {log.action === 'update' && log.old_values && log.new_values && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Ver cambios
                        </summary>
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="font-medium text-red-600 mb-1">Valores anteriores:</p>
                              <pre className="text-xs overflow-x-auto">
                                {JSON.stringify(log.old_values, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="font-medium text-green-600 mb-1">Valores nuevos:</p>
                              <pre className="text-xs overflow-x-auto">
                                {JSON.stringify(log.new_values, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Página {data.pagination.page} de {data.pagination.totalPages}
                {' '}({data.pagination.total} registros total)
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!data.pagination.hasPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!data.pagination.hasNext}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}