'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, FileText, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useCreateReportHistory, useUpdateReportHistory } from '@/hooks/useReportHistory';
import { notifications } from '@/components/ui/notification-toast';
import type { ReportFiltersData } from './ReportFilters';

interface ExportButtonsProps {
  organizationId: string;
  filters: ReportFiltersData;
  transactionCount: number;
  disabled?: boolean;
}

export function ExportButtons({
  organizationId,
  filters,
  transactionCount,
  disabled = false,
}: ExportButtonsProps) {
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  // Report history hooks
  const createReportHistory = useCreateReportHistory();
  const updateReportHistory = useUpdateReportHistory();

  const buildExportParams = () => {
    const params = new URLSearchParams({
      organization_id: organizationId,
    });

    if (filters.transactionType && filters.transactionType !== 'all') {
      params.append('type', filters.transactionType);
    }
    if (filters.accountId && filters.accountId !== 'all') {
      params.append('account_id', filters.accountId);
    }
    if (filters.categoryId && filters.categoryId !== 'all') {
      params.append('category_id', filters.categoryId);
    }
    if (filters.dateRange?.from) {
      params.append('start_date', filters.dateRange.from.toISOString().split('T')[0]);
    }
    if (filters.dateRange?.to) {
      params.append('end_date', filters.dateRange.to.toISOString().split('T')[0]);
    }

    return params.toString();
  };

  const handleCsvExport = async () => {
    if (disabled || transactionCount === 0) return;

    let reportHistoryId: string | null = null;
    const startTime = Date.now();

    try {
      setIsExportingCsv(true);
      
      // Generate filename with date range
      const dateStr = filters.dateRange?.from 
        ? `${filters.dateRange.from.toISOString().split('T')[0]}_${filters.dateRange?.to?.toISOString().split('T')[0] || 'actual'}`
        : new Date().toISOString().split('T')[0];
      
      const fileName = `reporte_transacciones_${dateStr}.csv`;

      // Create report history entry
      const reportHistory = await createReportHistory.mutateAsync({
        organization_id: organizationId,
        report_type: 'csv',
        file_name: fileName,
        filters: {
          ...filters,
          start_date: filters.dateRange?.from?.toISOString().split('T')[0],
          end_date: filters.dateRange?.to?.toISOString().split('T')[0],
        },
        transaction_count: transactionCount,
      });
      
      reportHistoryId = reportHistory.id;
      
      const params = buildExportParams();
      const response = await fetch(`/api/reports/export-csv?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar el reporte CSV');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      // Update report history as completed
      const generationTime = Date.now() - startTime;
      if (reportHistoryId) {
        await updateReportHistory.mutateAsync({
          id: reportHistoryId,
          data: {
            status: 'completed',
            file_size_bytes: blob.size,
            generation_time_ms: generationTime,
          },
        });
      }
      
      // Show enhanced success notification
      notifications.reportGenerated(fileName, 'csv');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al exportar CSV';
      
      // Update report history as failed if we created one
      if (reportHistoryId) {
        try {
          await updateReportHistory.mutateAsync({
            id: reportHistoryId,
            data: {
              status: 'failed',
              error_message: errorMessage,
              generation_time_ms: Date.now() - startTime,
            },
          });
        } catch (updateError) {
          console.error('Error updating report history:', updateError);
        }
      } else {
        // Show enhanced error notification if we couldn't create report history
        notifications.reportFailed('csv', errorMessage);
      }
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handlePdfExport = async () => {
    if (disabled || transactionCount === 0) return;

    let reportHistoryId: string | null = null;
    const startTime = Date.now();

    try {
      setIsExportingPdf(true);
      
      // Generate filename with date range
      const dateStr = filters.dateRange?.from 
        ? `${filters.dateRange.from.toISOString().split('T')[0]}_${filters.dateRange?.to?.toISOString().split('T')[0] || 'actual'}`
        : new Date().toISOString().split('T')[0];
      
      const fileName = `reporte_transacciones_${dateStr}.pdf`;

      // Create report history entry
      const reportHistory = await createReportHistory.mutateAsync({
        organization_id: organizationId,
        report_type: 'pdf',
        file_name: fileName,
        filters: {
          ...filters,
          start_date: filters.dateRange?.from?.toISOString().split('T')[0],
          end_date: filters.dateRange?.to?.toISOString().split('T')[0],
        },
        transaction_count: transactionCount,
      });
      
      reportHistoryId = reportHistory.id;
      
      const params = buildExportParams();
      const response = await fetch(`/api/reports/export-pdf?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar el reporte PDF');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      // Update report history as completed
      const generationTime = Date.now() - startTime;
      if (reportHistoryId) {
        await updateReportHistory.mutateAsync({
          id: reportHistoryId,
          data: {
            status: 'completed',
            file_size_bytes: blob.size,
            generation_time_ms: generationTime,
          },
        });
      }
      
      // Show enhanced success notification
      notifications.reportGenerated(fileName, 'pdf');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al exportar PDF';
      
      // Update report history as failed if we created one
      if (reportHistoryId) {
        try {
          await updateReportHistory.mutateAsync({
            id: reportHistoryId,
            data: {
              status: 'failed',
              error_message: errorMessage,
              generation_time_ms: Date.now() - startTime,
            },
          });
        } catch (updateError) {
          console.error('Error updating report history:', updateError);
        }
      } else {
        // Show enhanced error notification if we couldn't create report history
        notifications.reportFailed('pdf', errorMessage);
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  const getDateRangeText = () => {
    if (!filters.dateRange?.from) return '';
    
    const fromDate = filters.dateRange.from.toLocaleDateString('es-DO');
    const toDate = filters.dateRange.to?.toLocaleDateString('es-DO') || 'Actual';
    
    return `${fromDate} - ${toDate}`;
  };

  return (
    <div className="space-y-4">
      {/* Export Info */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Se exportarán</span>
        <Badge variant="outline">
          {transactionCount} transacción{transactionCount !== 1 ? 'es' : ''}
        </Badge>
        {getDateRangeText() && (
          <>
            <span>del período</span>
            <Badge variant="outline">{getDateRangeText()}</Badge>
          </>
        )}
      </div>

      {/* Export Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* CSV Export */}
        <Button
          onClick={handleCsvExport}
          disabled={disabled || isExportingCsv || isExportingPdf || createReportHistory.isPending}
          className="flex items-center gap-2 min-w-[140px]"
          variant="outline"
        >
          {isExportingCsv ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Generando CSV...</span>
              <span className="sm:hidden">Generando...</span>
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-4 w-4" />
              Exportar CSV
            </>
          )}
        </Button>

        {/* PDF Export */}
        <Button
          onClick={handlePdfExport}
          disabled={disabled || isExportingPdf || isExportingCsv || createReportHistory.isPending}
          className="flex items-center gap-2 min-w-[140px]"
        >
          {isExportingPdf ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Generando PDF...</span>
              <span className="sm:hidden">Generando...</span>
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Exportar PDF
            </>
          )}
        </Button>
      </div>

      {/* Loading Progress Indicator */}
      {(isExportingCsv || isExportingPdf) && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <div className="flex-1">
            <div className="font-medium text-blue-900">
              {isExportingCsv ? 'Generando reporte CSV' : 'Generando reporte PDF'}
            </div>
            <div className="text-blue-700">
              Esto puede tomar unos momentos dependiendo de la cantidad de datos...
            </div>
          </div>
        </div>
      )}

      {/* Export Notes */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <strong>CSV:</strong> Archivo de datos compatible con Excel y otras hojas de cálculo.
          Ideal para análisis detallado y manipulación de datos.
        </p>
        <p>
          <strong>PDF:</strong> Reporte formateado listo para imprimir o compartir.
          Incluye resumen, gráficos y formato profesional.
        </p>
      </div>

      {/* Disabled State Message */}
      {disabled && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
          <Download className="h-4 w-4" />
          <span>
            No hay transacciones para exportar. Ajusta los filtros para incluir más datos.
          </span>
        </div>
      )}
    </div>
  );
}