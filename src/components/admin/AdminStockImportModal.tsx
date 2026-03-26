import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import { X, Upload, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

interface SetupStepProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AdminStockImportModal: React.FC<SetupStepProps> = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ processed: number, total: number } | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setSuccessMessage(null);
        }
    };

    const processExcel = async () => {
        if (!file) {
            setError('Please select a file first.');
            return;
        }

        setLoading(true);
        setError(null);
        setProgress(null);

        try {
            // 1. Fetch SKUs and Warehouses to map IDs
            const { data: pData, error: pErr } = await supabase.from('products').select('id, sku');
            if (pErr) throw pErr;
            const productMap = new Map((pData as any[]).map(p => [String(p.sku).trim().toLowerCase(), p.id]));

            const { data: wData, error: wErr } = await supabase.from('warehouses').select('id, name');
            if (wErr) throw wErr;
            const warehouseMap = new Map((wData as any[]).map(w => [String(w.name).trim().toLowerCase(), w.id]));

            // 2. Parse Excel
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            if (!wb.SheetNames.length) throw new Error("Excel file is empty");
            
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            
            if (data.length < 2) throw new Error("Excel file must contain headers and at least one data row");

            const headers = data[0].map(h => String(h).trim().toLowerCase());
            const skuColIdx = headers.indexOf('sku');
            
            if (skuColIdx === -1) throw new Error("Could not find 'SKU' column header");

            // Identify warehouse columns
            const whColumns: { idx: number, warehouseId: string, name: string }[] = [];
            headers.forEach((h, idx) => {
                if (idx !== skuColIdx && warehouseMap.has(h)) {
                    whColumns.push({ idx, warehouseId: warehouseMap.get(h)!, name: h });
                }
            });

            if (whColumns.length === 0) {
                throw new Error("No warehouse headers found matching exact names in the system.");
            }

            const payload: { product_id: string, warehouse_id: string, qty: number }[] = [];

            // 3. Process Rows
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length === 0) continue;

                const skuRaw = row[skuColIdx];
                if (!skuRaw) continue;

                const sku = String(skuRaw).trim().toLowerCase();
                const productId = productMap.get(sku);

                if (!productId) {
                    // Skip or warn? For now we just silently skip missing SKUs.
                    continue;
                }

                whColumns.forEach(col => {
                    const rawVal = row[col.idx];
                    const qty = parseInt(String(rawVal), 10);
                    if (!isNaN(qty) && qty > 0) {
                        payload.push({
                            product_id: productId,
                            warehouse_id: col.warehouseId,
                            qty
                        });
                    }
                });
            }

            if (payload.length === 0) {
                throw new Error("No valid stock additions found in the file.");
            }

            setProgress({ processed: 0, total: payload.length });

            // 4. Send to RPC
            const { error: rpcErr } = await supabase.rpc('bulk_add_warehouse_stocks', {
                p_items: payload
            });

            if (rpcErr) throw rpcErr;

            setProgress({ processed: payload.length, total: payload.length });
            setSuccessMessage(`Successfully added ${payload.length} stock allocations.`);
            
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error processing Excel file');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in text-left">
            <div className="bg-white rounded-[2rem] shadow-premium max-w-md w-full overflow-hidden animate-slide-up">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Import Stock Additions</h2>
                        <p className="text-xs text-slate-500 mt-1">Upload XLSX with SKU and Warehouse headers.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Format Guide */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                        <h3 className="text-xs font-black text-indigo-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <FileSpreadsheet size={14} /> Expected Format
                        </h3>
                        <p className="text-xs text-indigo-600 leading-relaxed">
                            Row 1 headers must include <strong className="font-mono">SKU</strong>. Any other headers matching exact <strong className="font-mono">Warehouse Names</strong> will be mapped. Values must be integers representing the quantity to <strong className="font-bold underline">add</strong> to existing stock.
                        </p>
                    </div>

                    <div className="relative group">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={loading || !!successMessage}
                        />
                        <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                            file ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 group-hover:border-indigo-400 group-hover:bg-slate-50'
                        }`}>
                            <div className="w-16 h-16 mx-auto bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                                {file ? (
                                    <FileSpreadsheet className="text-indigo-600" size={32} />
                                ) : (
                                    <Upload className="text-slate-400 group-hover:text-indigo-500 transition-colors" size={32} />
                                )}
                            </div>
                            <p className="font-bold text-slate-900 mb-1">
                                {file ? file.name : 'Click or drag Excel file here'}
                            </p>
                            <p className="text-xs text-slate-500">
                                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports .xlsx, .xls'}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-2">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100 flex items-center gap-2">
                            <CheckCircle2 size={18} />
                            <p>{successMessage}</p>
                        </div>
                    )}

                    {progress && loading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500">
                                <span>Processing...</span>
                                <span>{progress.processed} / {progress.total} Updates</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-indigo-600 transition-all duration-300"
                                    style={{ width: `${Math.max(5, (progress.processed / progress.total) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            onClick={processExcel}
                            disabled={!file || loading || !!successMessage}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition disabled:opacity-50 shadow-premium"
                        >
                            {loading ? (
                                <><Loader2 className="animate-spin" size={20} /> Processing...</>
                            ) : successMessage ? (
                                <><CheckCircle2 size={20} /> Success!</>
                            ) : (
                                <><Upload size={20} /> Import Stock Additions</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
