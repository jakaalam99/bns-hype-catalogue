import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import { X, Upload, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';

interface AdminNewDropImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchId: string;
    onSuccess: () => void;
}

export const AdminNewDropImportModal: React.FC<AdminNewDropImportModalProps> = ({ 
    isOpen, onClose, batchId, onSuccess 
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<{ processed: number, added: number, skipped: number } | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setSummary(null);
        }
    };

    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['sku', 'notes'],
            ['BNS-TEST-001', 'Coming this Friday!'],
            ['BNS-TEST-002', 'Limited edition colorway']
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'New_Drop_Items');
        XLSX.writeFile(wb, 'New_Drop_Import_Template.xlsx');
    };

    const processExcel = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setSummary(null);

        try {
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws) as any[];

            if (data.length === 0) throw new Error("Excel file is empty");

            // Fetch products to match SKUs
            const skus = data.map(row => String(row.sku || row.SKU || '').trim()).filter(Boolean);
            const { data: products } = await supabase
                .from('products')
                .select('id, sku')
                .in('sku', skus);

            const productMap = new Map(products?.map(p => [p.sku.toLowerCase(), p.id]));

            const itemsToAdd: any[] = [];
            let skipped = 0;

            for (const row of data) {
                const rowSku = String(row.sku || row.SKU || '').trim();
                const productId = productMap.get(rowSku.toLowerCase());
                
                if (!productId) {
                    skipped++;
                    continue;
                }

                itemsToAdd.push({
                    batch_id: batchId,
                    product_id: productId,
                    notes: row.notes || row.Notes || ''
                });
            }

            if (itemsToAdd.length === 0) {
                throw new Error("No matching products found for the SKUs in your file.");
            }

            const { error: insertError } = await supabase
                .from('new_drops_items')
                .upsert(itemsToAdd, { onConflict: 'batch_id,product_id' });

            if (insertError) throw insertError;

            setSummary({
                processed: data.length,
                added: itemsToAdd.length,
                skipped: skipped
            });

        } catch (err: any) {
            console.error('Import error:', err);
            setError(err.message || 'Failed to process Excel file');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in text-left">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bulk Import Drop</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Upload Product List</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-10 space-y-8">
                    {!summary && (
                        <>
                            <div className="bg-indigo-50/50 rounded-2xl p-6 flex justify-between items-center border border-indigo-50">
                                <p className="text-xs font-bold text-indigo-600 italic">Need the format?</p>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                                >
                                    <Download size={12} /> Template
                                </button>
                            </div>

                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    disabled={loading}
                                />
                                <div className={`border-2 border-dashed rounded-[2.5rem] p-10 text-center transition-all ${
                                    file ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 group-hover:border-indigo-400 group-hover:bg-slate-50'
                                }`}>
                                    <div className="w-20 h-20 mx-auto bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                                        {file ? (
                                            <FileSpreadsheet className="text-indigo-600" size={40} />
                                        ) : (
                                            <Upload className="text-slate-200 group-hover:text-indigo-500 transition-colors" size={40} />
                                        )}
                                    </div>
                                    <p className="font-black text-slate-900 text-lg mb-1 truncate">
                                        {file ? file.name : 'Select Excel File'}
                                    </p>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                        {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports .xlsx, .xls, .csv'}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 flex items-start gap-3">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {summary && (
                        <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
                            <div className="flex items-center gap-4 text-emerald-600">
                                <CheckCircle2 size={32} />
                                <h3 className="font-black text-2xl">Import Success</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Added</p>
                                    <p className="text-3xl font-black text-slate-900">{summary.added}</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Skipped</p>
                                    <p className="text-3xl font-black text-amber-500">{summary.skipped}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    onSuccess();
                                    onClose();
                                }}
                                className="w-full py-5 bg-zinc-950 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg"
                            >
                                Continue
                            </button>
                        </div>
                    )}

                    {!summary && (
                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={onClose}
                                className="flex-1 py-5 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={processExcel}
                                disabled={!file || loading}
                                className="flex-[2] flex items-center justify-center gap-3 py-5 bg-zinc-950 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-30 shadow-premium"
                            >
                                {loading ? (
                                    <><Loader2 className="animate-spin" size={20} /> Processing</>
                                ) : (
                                    <><Upload size={20} /> Import List</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
