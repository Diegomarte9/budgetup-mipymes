'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/utils/currency';
import { useReportHistoryManager } from '@/hooks/useReportHistory';
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RefreshCw,
  Calendar,
  User,
  FileX,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ReportHistoryProps {
  organizationId: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'generating':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'generating':
      return 'secondary' as const;
    case 'completed':
      return 'default' as const;
    case 'failed':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'generating':
      return 'Generando';
    case 'completed':
      return 'Completado';
    case 'failed':
      return 'Fallido';
    default:
      return status;
  }
};

const getReportTypeIcon = (type: string) => {
  switch (type) {
    case 'csv':
      return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    case 'pdf':
      return <FileText className="h-4 w-4 text-red-600" />;
    default:
      return <FileX className="h-4 w-4" />;
  }
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return 'N/A';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
};

const formatDuration = (ms?: number) => {
  if (!ms) return 'N/A';
  
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
};

const formatFilters = (filters: Record<string, any>) => {
  const filterLabels: string[] = [];
  
  if (filters.transactionType) {
    const typeLabels = {
      income: 'Ingresos',
      expense: 'Gastos',
      transfer: 'Transferencias'
    };
    filterLabels.push(typeLabels[filters.transactionType as keyof typeof typeLabels] || filters.transactionType);
  }
  
  if (filters.start_date && filters.end_date) {
    const startDate = new Date(filters.start_date).toLocaleDateString('es-DO');
    const endDate = new Date(filters.end_date).toLocaleDateString('es-DO');
    filterLabels.push(`${startDate} - ${endDate}`);
  }
  
  if (filters.accountId) {
    filterLabels.push('Cuenta específica');
  }
  
  if (filters.categoryId) {
    filterLabels.push('Categoría específica');
  }
  
  return filterLabels.length > 0 ? filterLabels.join(', ') : 'Sin filtros';
};

export function ReportHistory({ organizationId }: ReportHistoryProps) {
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  
  const {
    reports,
    total,
    isLoading,
    error,
    currentPage,
    totalPages,
    setCurrentPage,
    deleteReport,
    refetch,
    isDeleting,
  } = useReportHistoryManager(organizationId);

  const handleDeleteReport = async (id: string) => {
    try {
      await deleteReport(id);
      setDeleteReportId(null);
    } catch (error) {
      // Error is handled by the hook
      console.error('Error deleting report:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Reportes</CardTitle>
          <CardDescription>
            Historial de reportes generados recientemente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Reportes</CardTitle>
          <CardDescription>
            Historial de reportes generados recientemente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Error al cargar historial</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              No se pudo cargar el historial de reportes. Esto puede deberse a un problema de conexión.
            </p>
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Intentar de nuevo
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Historial de Reportes</CardTitle>
            <CardDescription>
              Historial de reportes generados recientemente ({total} total)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay reportes</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Aún no has generado ningún reporte. Los reportes que generes aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Archivo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Transacciones</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getReportTypeIcon(report.report_type)}
                          <div>
                            <div className="font-medium">{report.file_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatFilters(report.filters)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusBadgeVariant(report.status)}
                          className="flex items-center gap-1 w-fit"
                        >
                          {getStatusIcon(report.status)}
                          {getStatusLabel(report.status)}
                        </Badge>
                        {report.error_message && (
                          <div className="text-xs text-red-600 mt-1 max-w-[200px] truncate">
                            {report.error_message}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {report.transaction_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatFileSize(report.file_size_bytes)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDuration(report.generation_time_ms)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(report.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {report.auth?.users?.email || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteReportId(report.id)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar reporte?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente el registro de este reporte del historial.
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeleteReportId(null)}>
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteReport(report.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getReportTypeIcon(report.report_type)}
                      <div>
                        <div className="font-medium">{report.file_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatFilters(report.filters)}
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant={getStatusBadgeVariant(report.status)}
                      className="flex items-center gap-1"
                    >
                      {getStatusIcon(report.status)}
                      {getStatusLabel(report.status)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Transacciones</div>
                      <Badge variant="outline">{report.transaction_count}</Badge>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Tamaño</div>
                      <div>{formatFileSize(report.file_size_bytes)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Duración</div>
                      <div>{formatDuration(report.generation_time_ms)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Creado</div>
                      <div>{formatDate(report.created_at)}</div>
                    </div>
                  </div>

                  {report.error_message && (
                    <div className="text-xs text-red-600 p-2 bg-red-50 rounded">
                      {report.error_message}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      Por: {report.auth?.users?.email || 'N/A'}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteReportId(report.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar reporte?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará permanentemente el registro de este reporte del historial.
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeleteReportId(null)}>
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteReport(report.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Página {currentPage + 1} de {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}