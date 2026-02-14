'use client';

import { useState, useRef, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { importOfxTransactions, ImportResult } from '@/lib/actions/ofx-import';
import { OfxTransaction } from '@/lib/ofx/types';

interface OfxImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: number;
  onImportComplete: (result: ImportResult) => void;
}

interface ParsedPreview {
  transactions: OfxTransaction[];
}

export function OfxImportDialog({
  open,
  onOpenChange,
  accountId,
  onImportComplete,
}: OfxImportDialogProps) {
  const [parsed, setParsed] = useState<ParsedPreview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const resetState = () => {
    setParsed(null);
    setSelected(new Set());
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const { parseOfxFile } = await import('@/lib/ofx/parser');
      const result = await parseOfxFile(content);
      
      setParsed({ transactions: result.transactions });
      setSelected(new Set(result.transactions.map((t) => t.fitid)));
      setError(null);
    } catch (err) {
      setError(`Failed to parse OFX file: ${err}`);
      setParsed(null);
    }
  };

  const handleImport = () => {
    if (!parsed) return;

    startTransition(async () => {
      setImporting(true);
      setError(null);
      setSuccess(null);
      
      try {
        const selectedTxs = parsed.transactions.filter((t) =>
          selected.has(t.fitid)
        );

        const result = await importOfxTransactions(accountId, selectedTxs);
        
        setSuccess(`Imported ${result.imported} transactions, skipped ${result.skipped} duplicates`);
        onImportComplete(result);
        
        setTimeout(() => {
          onOpenChange(false);
          resetState();
        }, 1500);
      } catch (err) {
        setError(`Import failed: ${err}`);
      } finally {
        setImporting(false);
      }
    });
  };

  const toggleAll = (checked: boolean) => {
    if (!parsed) return;
    if (checked) {
      setSelected(new Set(parsed.transactions.map((t) => t.fitid)));
    } else {
      setSelected(new Set());
    }
  };

  const toggleOne = (fitid: string, checked: boolean) => {
    const newSelected = new Set(selected);
    if (checked) {
      newSelected.add(fitid);
    } else {
      newSelected.delete(fitid);
    }
    setSelected(newSelected);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const allSelected = parsed ? selected.size === parsed.transactions.length : false;
  const someSelected = selected.size > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import OFX File</DialogTitle>
          <DialogDescription>
            Upload an OFX file to import transactions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <input
              type="file"
              accept=".ofx"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-opacity-90 cursor-pointer"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-600 text-sm p-2 bg-green-50 rounded">
              {success}
            </div>
          )}

          {parsed && (
            <>
              <div className="flex items-center gap-4 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm">
                    {allSelected ? 'Deselect All' : 'Select All'} ({parsed.transactions.length} transactions)
                  </span>
                </label>
                <span className="text-sm text-muted-foreground">
                  {selected.size} selected
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payee (REFNUM)</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Memo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.transactions.map((tx) => (
                      <TableRow key={tx.fitid}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selected.has(tx.fitid)}
                            onChange={(e) => toggleOne(tx.fitid, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell className="max-w-xs truncate" title={tx.refnum}>
                          {tx.refnum}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          ${tx.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={tx.memo}>
                          {tx.memo}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!parsed || !someSelected || importing || isPending}
            >
              {importing || isPending ? 'Importing...' : 'Import Selected'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}