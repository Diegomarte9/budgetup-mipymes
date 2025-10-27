'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
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

  const buildExportParams = () => {
    const params = new URLSearchParams({
      organization_id: organizationId,
    });

    if (filters.transactionType) {
      params.append('type', filters.transactionType);
    }
    if (filters.accountId) {
      params.append('account_id', filters.accountId);
    }
    if (filters.categoryId) {
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

    try {
      setIsExportingCsv(true);
      
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
      
      // Generate filename with date range
      const dateStr = filters.dateRange?.from 
        ? `${filters.dateRange.from.toISOString().split('T')[0]}_${filters.dateRange?.to?.toISOString().split('T')[0] || 'actual'}`
        : new Date().toISOString().split('T')[0];
      
      link.download = `reporte_transacciones_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.success('Reporte CSV descargado exitosamente');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error(error instanceof Error ? error.message : 'Error al exportar CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handlePdfExport = async () => {
    if (disabled || transactionCount === 0) return;

    try {
      setIsExportingPdf(true);
      
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
      
      // Generate filename with date range
      const dateStr = filters.dateRange?.from 
        ? `${filters.dateRange.from.toISOString().split('T')[0]}_${filters.dateRange?.to?.toISOString().split('T')[0] || 'actual'}`
        : new Date().toISOString().split('T')[0];
      
      link.download = `reporte_transacciones_${dateStr}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.success('Reporte PDF descargado exitosamente');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Error al exportar PDF');
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
          disabled={disabled || isExportingCsv || isExportingPdf}
          className="flex items-center gap-2"
          variant="outline"
        >
          {isExportingCsv ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          {isExportingCsv ? 'Generando CSV...' : 'Exportar CSV'}
        </Button>

        {/* PDF Export */}
        <Button
          onClick={handlePdfExport}
          disabled={disabled || isExportingPdf || isExportingCsv}
          className="flex items-center gap-2"
        >
          {isExportingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {isExportingPdf ? 'Generando PDF...' : 'Exportar PDF'}
        </Button>
      </div>

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