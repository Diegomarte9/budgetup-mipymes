'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download,
  Eye,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface CSVRow {
  type: string;
  amount: string;
  description: string;
  occurred_at: string;
  account_name: string;
  category_name?: string;
  transfer_to_account_name?: string;
  itbis_pct?: string;
  notes?: string;
  currency?: string;
}

interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: ImportError[];
  skipped: number;
}

interface TransactionImportProps {
  organizationId: string;
  onSuccess?: (result: ImportResult) => void;
  onClose?: () => void;
}

export function TransactionImport({ organizationId, onSuccess, onClose }: TransactionImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<CSVRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      toast.error('Solo se permiten archivos CSV');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (máximo 5MB)');
      return;
    }

    setFile(selectedFile);
    
    try {
      // Parse CSV for preview
      const content = await selectedFile.text();
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('El archivo CSV debe contener al menos una fila de datos');
        return;
      }

      const header = lines[0].split(',').map(col => col.trim().replace(/"/g, ''));
      const rows: CSVRow[] = [];

      // Parse first 10 rows for preview
      const previewLines = lines.slice(1, Math.min(11, lines.length));
      
      for (const line of previewLines) {
        const values = line.split(',').map(val => val.trim().replace(/^"|"$/g, ''));
        const rowData: Record<string, string> = {};
        
        header.forEach((col, index) => {
          rowData[col] = values[index] || '';
        });

        rows.push({
          type: rowData.type || '',
          amount: rowData.amount || '',
          description: rowData.description || '',
          occurred_at: rowData.occurred_at || '',
          account_name: rowData.account_name || '',
          category_name: rowData.category_name,
          transfer_to_account_name: rowData.transfer_to_account_name,
          itbis_pct: rowData.itbis_pct,
          notes: rowData.notes,
          currency: rowData.currency,
        });
      }

      setPreviewData(rows);
      setCsvData(rows);
      toast.success(`Archivo cargado: ${lines.length - 1} filas encontradas`);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Error al leer el archivo CSV');
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleImport = async () => {
    if (!file || !organizationId) {
      toast.error('Archivo y organización requeridos');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organization_id', organizationId);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en la importación');
      }

      setImportResult(data.result);
      
      if (data.result.success) {
        toast.success(data.message);
        onSuccess?.(data.result);
      } else {
        toast.warning(data.message);
      }

    } catch (error) {
      console.error('Error importing CSV:', error);
      toast.error((error as Error).message || 'Error al importar el archivo');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = () => {
    const template = [
      'type,amount,description,occurred_at,account_name,category_name,transfer_to_account_name,itbis_pct,notes,currency',
      'income,1500.00,Venta de productos,2024-01-15,Efectivo,Ventas,,,Venta del día,DOP',
      'expense,500.00,Pago de renta,2024-01-15,Banco,Renta,,,Renta mensual,DOP',
      'transfer,1000.00,Transferencia a ahorros,2024-01-15,Efectivo,,Banco,,,DOP'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_transacciones.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setFile(null);
    setCsvData([]);
    setPreviewData([]);
    setImportResult(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Importar Transacciones</h2>
          <p className="text-gray-600">
            Importa múltiples transacciones desde un archivo CSV
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5" />
            Plantilla CSV
          </CardTitle>
          <CardDescription>
            Descarga la plantilla para conocer el formato requerido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={downloadTemplate} variant="outline" className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Descargar Plantilla
            </Button>
            
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Columnas requeridas:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code>type</code>: income, expense, o transfer</li>
                <li><code>amount</code>: Monto (número positivo)</li>
                <li><code>description</code>: Descripción de la transacción</li>
                <li><code>occurred_at</code>: Fecha (YYYY-MM-DD)</li>
                <li><code>account_name</code>: Nombre de la cuenta (debe existir)</li>
              </ul>
              
              <p className="font-medium mt-4 mb-2">Columnas opcionales:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code>category_name</code>: Categoría (requerida para income/expense)</li>
                <li><code>transfer_to_account_name</code>: Cuenta destino (para transfers)</li>
                <li><code>itbis_pct</code>: Porcentaje ITBIS (para expenses)</li>
                <li><code>notes</code>: Notas adicionales</li>
                <li><code>currency</code>: Moneda (por defecto DOP)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Archivo CSV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Drop Zone */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Arrastra tu archivo CSV aquí
              </p>
              <p className="text-gray-500 mb-4">
                o haz clic para seleccionar un archivo
              </p>
              <p className="text-sm text-gray-400">
                Máximo 5MB • Solo archivos .csv
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* File Info */}
            {file && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB • {csvData.length} filas de vista previa
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {csvData.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(true)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Vista Previa
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetImport}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importando transacciones...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {/* Import Button */}
            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={!file || isUploading}
                className="flex-1"
              >
                {isUploading ? 'Importando...' : 'Importar Transacciones'}
              </Button>
              {file && !isUploading && (
                <Button variant="outline" onClick={resetImport}>
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Resultado de la Importación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                  <p className="text-sm text-green-700">Importadas</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
                  <p className="text-sm text-red-700">Errores</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">{importResult.skipped}</p>
                  <p className="text-sm text-gray-700">Omitidas</p>
                </div>
              </div>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Errores Encontrados
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {importResult.errors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertDescription>
                          <span className="font-medium">Fila {error.row}:</span>{' '}
                          {error.field && <span className="text-sm">({error.field}) </span>}
                          {error.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Message */}
              {importResult.success && importResult.imported > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    ¡Importación exitosa! Se han importado {importResult.imported} transacciones.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Vista Previa del CSV</DialogTitle>
            <DialogDescription>
              Primeras {previewData.length} filas del archivo
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Cuenta Destino</TableHead>
                  <TableHead>ITBIS %</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant={
                        row.type === 'income' ? 'default' :
                        row.type === 'expense' ? 'destructive' :
                        'secondary'
                      }>
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.amount}</TableCell>
                    <TableCell className="max-w-xs truncate">{row.description}</TableCell>
                    <TableCell>{row.occurred_at}</TableCell>
                    <TableCell>{row.account_name}</TableCell>
                    <TableCell>{row.category_name || '-'}</TableCell>
                    <TableCell>{row.transfer_to_account_name || '-'}</TableCell>
                    <TableCell>{row.itbis_pct || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{row.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}