'use client';

import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Info, Download } from 'lucide-react';

export interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Enhanced notification functions with better UX
export const notifications = {
  success: (message: string, options?: NotificationOptions) => {
    return toast.success(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <CheckCircle className="h-4 w-4" />,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    });
  },

  error: (message: string, options?: NotificationOptions) => {
    return toast.error(message, {
      description: options?.description,
      duration: options?.duration || 6000,
      icon: <XCircle className="h-4 w-4" />,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    });
  },

  warning: (message: string, options?: NotificationOptions) => {
    return toast.warning(message, {
      description: options?.description,
      duration: options?.duration || 5000,
      icon: <AlertCircle className="h-4 w-4" />,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    });
  },

  info: (message: string, options?: NotificationOptions) => {
    return toast.info(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <Info className="h-4 w-4" />,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    });
  },

  // Specialized notifications for reports
  reportGenerated: (fileName: string, type: 'csv' | 'pdf') => {
    return toast.success(`Reporte ${type.toUpperCase()} generado exitosamente`, {
      description: `El archivo "${fileName}" se ha descargado correctamente.`,
      duration: 5000,
      icon: <Download className="h-4 w-4" />,
    });
  },

  reportFailed: (type: 'csv' | 'pdf', error?: string) => {
    return toast.error(`Error al generar reporte ${type.toUpperCase()}`, {
      description: error || 'Ocurrió un error inesperado durante la generación del reporte.',
      duration: 8000,
      icon: <XCircle className="h-4 w-4" />,
      action: {
        label: 'Reintentar',
        onClick: () => {
          // This would be handled by the calling component
          console.log('Retry report generation');
        },
      },
    });
  },

  reportGenerating: (type: 'csv' | 'pdf', transactionCount: number) => {
    return toast.loading(`Generando reporte ${type.toUpperCase()}...`, {
      description: `Procesando ${transactionCount} transacciones. Esto puede tomar unos momentos.`,
    });
  },

  // Dismiss all toasts
  dismissAll: () => {
    toast.dismiss();
  },

  // Promise-based toast for async operations
  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    });
  },
};

export default notifications;