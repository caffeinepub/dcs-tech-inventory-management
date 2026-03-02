import { useRef, useState } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle2, XCircle, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useBulkImportInventory } from '../hooks/useQueries';
import type { BulkInventoryRecord, BulkImportResult } from '../backend';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ParsedRow {
  rowIndex: number;
  data: BulkInventoryRecord;
}

interface SkippedRow {
  rowIndex: number;
  reason: string;
  rawData: Record<string, string>;
}

interface ParseResult {
  valid: ParsedRow[];
  skipped: SkippedRow[];
  headerError?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const REQUIRED_HEADERS = ['partNumber', 'partName', 'description', 'quantity', 'stockThreshold', 'category', 'location'];

// ─── CSV Parser ────────────────────────────────────────────────────────────

function parseCsvText(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) {
    return { valid: [], skipped: [], headerError: 'The CSV file is empty.' };
  }

  // Parse headers
  const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const missingHeaders = REQUIRED_HEADERS.filter(h => !rawHeaders.includes(h));
  if (missingHeaders.length > 0) {
    return {
      valid: [],
      skipped: [],
      headerError: `Missing required headers: ${missingHeaders.join(', ')}. Expected: ${REQUIRED_HEADERS.join(', ')}`,
    };
  }

  const valid: ParsedRow[] = [];
  const skipped: SkippedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowIndex = i; // 1-based (row 1 = first data row after header)
    const values = splitCsvLine(lines[i]);
    const rawData: Record<string, string> = {};
    rawHeaders.forEach((header, idx) => {
      rawData[header] = (values[idx] ?? '').trim().replace(/^"|"$/g, '');
    });

    // Validate required fields
    const missingFields: string[] = [];
    if (!rawData.partNumber) missingFields.push('partNumber');
    if (!rawData.partName) missingFields.push('partName');
    if (!rawData.quantity) missingFields.push('quantity');

    if (missingFields.length > 0) {
      skipped.push({ rowIndex, reason: `Missing required fields: ${missingFields.join(', ')}`, rawData });
      continue;
    }

    // Validate numeric fields
    const partNumberNum = Number(rawData.partNumber);
    if (!Number.isInteger(partNumberNum) || partNumberNum <= 0) {
      skipped.push({ rowIndex, reason: `partNumber must be a positive integer (got: "${rawData.partNumber}")`, rawData });
      continue;
    }

    const quantityNum = Number(rawData.quantity);
    if (!Number.isInteger(quantityNum) || quantityNum < 0) {
      skipped.push({ rowIndex, reason: `quantity must be a non-negative integer (got: "${rawData.quantity}")`, rawData });
      continue;
    }

    const stockThresholdNum = rawData.stockThreshold !== '' ? Number(rawData.stockThreshold) : 0;
    if (!Number.isInteger(stockThresholdNum) || stockThresholdNum < 0) {
      skipped.push({ rowIndex, reason: `stockThreshold must be a non-negative integer (got: "${rawData.stockThreshold}")`, rawData });
      continue;
    }

    valid.push({
      rowIndex,
      data: {
        partNumber: BigInt(partNumberNum),
        partName: rawData.partName,
        description: rawData.description ?? '',
        quantity: BigInt(quantityNum),
        stockThreshold: BigInt(stockThresholdNum),
        category: rawData.category ?? '',
        location: rawData.location ?? '',
      },
    });
  }

  return { valid, skipped };
}

/** Splits a CSV line respecting quoted fields */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── Template Download ─────────────────────────────────────────────────────

function downloadTemplate() {
  const header = REQUIRED_HEADERS.join(',');
  const example = '1001,Widget A,A standard widget,50,10,Electronics,Warehouse A';
  const csv = `${header}\n${example}\n`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'inventory_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function CsvImportSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const bulkImport = useBulkImportInventory();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous results
    setImportResult(null);
    setParseResult(null);

    if (!file.name.endsWith('.csv')) {
      setFileName(file.name);
      setParseResult({ valid: [], skipped: [], headerError: 'Please upload a valid .csv file.' });
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCsvText(text);
      setParseResult(result);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;
    setImportResult(null);

    try {
      const records = parseResult.valid.map(r => r.data);
      const result = await bulkImport.mutateAsync(records);
      setImportResult(result);
      // Combine backend skipped rows with client-side skipped rows for full summary
    } catch {
      // Error handled by mutation onError
    }
  };

  const handleReset = () => {
    setFileName(null);
    setParseResult(null);
    setImportResult(null);
    bulkImport.reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clientSkippedCount = parseResult?.skipped.length ?? 0;
  const validCount = parseResult?.valid.length ?? 0;
  const backendCreated = importResult ? Number(importResult.createdCount) : 0;
  const backendUpdated = importResult ? Number(importResult.updatedCount) : 0;
  const backendSkipped = importResult ? Number(importResult.skippedCount) : 0;
  const totalSkipped = clientSkippedCount + backendSkipped;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">CSV Bulk Import</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload a CSV file to create or update inventory items in bulk.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs self-start sm:self-auto"
          onClick={downloadTemplate}
        >
          <Download className="h-3.5 w-3.5" />
          Download Template
        </Button>
      </div>

      {/* File drop zone */}
      <div
        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/20 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file && fileInputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInputRef.current.files = dt.files;
            fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        {fileName ? (
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">{fileName}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              <span className="text-primary font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">CSV files only</p>
          </div>
        )}
      </div>

      {/* Header error */}
      {parseResult?.headerError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Invalid File</AlertTitle>
          <AlertDescription>{parseResult.headerError}</AlertDescription>
        </Alert>
      )}

      {/* Parse preview (no header error) */}
      {parseResult && !parseResult.headerError && (
        <div className="space-y-4">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className="gap-1.5 text-xs bg-success/10 text-success border-success/20">
              <CheckCircle2 className="h-3 w-3" />
              {validCount} valid row{validCount !== 1 ? 's' : ''}
            </Badge>
            {clientSkippedCount > 0 && (
              <Badge variant="outline" className="gap-1.5 text-xs bg-warning/10 text-warning border-warning/20">
                <AlertTriangle className="h-3 w-3" />
                {clientSkippedCount} skipped row{clientSkippedCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Skipped rows detail */}
          {parseResult.skipped.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-warning/20 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-warning">Skipped Rows (will not be imported)</span>
              </div>
              <ScrollArea className="max-h-48">
                <div className="divide-y divide-warning/10">
                  {parseResult.skipped.map((row) => (
                    <div key={row.rowIndex} className="px-4 py-2.5 flex items-start gap-3">
                      <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0">
                        Row {row.rowIndex + 1}
                      </span>
                      <span className="text-xs text-warning/90">{row.reason}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {validCount === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No valid rows to import</AlertTitle>
              <AlertDescription>
                All rows were skipped due to validation errors. Please fix the issues and try again.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="rounded-lg border border-success/30 bg-success/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-success/20 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-success">Import Complete</span>
          </div>
          <div className="px-4 py-3 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{backendCreated}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Created</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{backendUpdated}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Updated</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-warning">{totalSkipped}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Skipped</p>
              </div>
            </div>

            {/* Backend skipped rows */}
            {importResult.skippedRows.length > 0 && (
              <>
                <Separator className="bg-success/20" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Backend-skipped rows:</p>
                  <ScrollArea className="max-h-32">
                    <div className="space-y-1">
                      {importResult.skippedRows.map((row, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">
                            Row {Number(row.rowIndex) + 1}: {row.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {parseResult && !parseResult.headerError && (
        <div className="flex gap-3">
          <Button
            onClick={handleImport}
            disabled={bulkImport.isPending || validCount === 0 || !!importResult}
            className="gap-2"
          >
            {bulkImport.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import {validCount} Row{validCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={bulkImport.isPending}>
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}
