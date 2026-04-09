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
    const [progress, setProgress] = useState<{ processed: number, total: number } | null>(null);
    const [summary, setSummary] = useState<{ processed: number, updated: number, skipped: number } | null>(null);

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
            ['SKU', 'Warehouse Category', 'Warehouse Location', 'QTY'],
            ['BNS-TEST-SKU', 'WH Pusat', 'Rak A1', 50],
            ['BNS-ANOTHER-SKU', 'WH Online', 'Rak B2', 25]
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'Stock_Import_Template.xlsx');
    };

    const processExcel = async () => {
        if (!file) {
            setError('Please select a file first.');
            return;
        }

        setLoading(true);
        setError(null);
        setProgress(null);
        setSummary(null);

        try {
            // 1. Fetch Metadata in bulk once
            const [pRes, catRes, whRes] = await Promise.all([
                supabase.from('products').select('id, sku'),
                supabase.from('warehouse_categories').select('id, name'),
                supabase.from('warehouses').select('id, name, category_id')
            ]);

            if (pRes.error) throw pRes.error;
            if (catRes.error) throw catRes.error;
            if (whRes.error) throw whRes.error;

            const productMap = new Map((pRes.data as any[]).map(p => [String(p.sku).trim().toLowerCase(), p.id]));
            const catMap = new Map((catRes.data as any[]).map(c => [c.name.toLowerCase(), c.id]));
            const whMap = new Map((whRes.data as any[]).map(w => [`${w.category_id}|${w.name.toLowerCase()}`, w.id]));

            // 2. Parse Excel
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            if (!wb.SheetNames.length) throw new Error("Excel file is empty");
            
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            
            if (data.length < 2) throw new Error("Excel file must contain headers and at least one data row");

            const headers = data[0].map(h => String(h).trim().toLowerCase());
            const skuCol = headers.indexOf('sku');
            const catCol = headers.findIndex(h => h.includes('category'));
            const locCol = headers.findIndex(h => h === 'warehouse location' || h === 'location');
            const qtyCol = headers.findIndex(h => h === 'qty' || h === 'quantity');
            
            if (skuCol === -1 || catCol === -1 || locCol === -1 || qtyCol === -1) {
                throw new Error("Missing required columns: SKU, Warehouse Category, Warehouse Location, QTY");
            }

            // 3. Metadata Reconciliation (Categories & Warehouses)
            const tempCatIdMap = new Map(catMap);
            const tempWhIdMap = new Map(whMap);
            let skippedSkus = 0;
            let totalPayload: { product_id: string, warehouse_id: string, qty: number }[] = [];

            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length === 0) continue;

                const skuRaw = row[skuCol];
                const catRaw = row[catCol];
                const locRaw = row[locCol];
                const qtyRaw = row[qtyCol];

                if (!skuRaw || !catRaw || !locRaw || !qtyRaw) continue;

                const sku = String(skuRaw).trim().toLowerCase();
                const productId = productMap.get(sku);
                
                if (!productId) {
                    skippedSkus++;
                    continue;
                }

                const catName = String(catRaw).trim();
                const locName = String(locRaw).trim();
                const qty = parseInt(String(qtyRaw), 10);
                if (isNaN(qty)) continue;

                // Handle Category Creation
                let catId = tempCatIdMap.get(catName.toLowerCase());
                if (!catId) {
                    const { data: newCat, error: catErr } = await supabase.from('warehouse_categories').insert({ name: catName }).select('id').single();
                    if (catErr) throw catErr;
                    catId = newCat.id;
                    tempCatIdMap.set(catName.toLowerCase(), catId);
                }

                // Handle Warehouse Creation
                const whKey = `${catId}|${locName.toLowerCase()}`;
                let whId = tempWhIdMap.get(whKey);
                if (!whId) {
                    const { data: newWh, error: whErr } = await supabase.from('warehouses').insert({ name: locName, category_id: catId }).select('id').single();
                    if (whErr) throw whErr;
                    whId = newWh.id;
                    tempWhIdMap.set(whKey, whId);
                }

                totalPayload.push({
                    product_id: productId,
                    warehouse_id: whId,
                    qty
                });
            }

            if (totalPayload.length === 0) {
                throw new Error(`Import failed: No valid products found. Skipped ${skippedSkus} unknown SKUs.`);
            }

            // 4. Chunked Upload (1,000 rows per batch)
            const CHUNK_SIZE = 1000;
            const totalItems = totalPayload.length;
            setProgress({ processed: 0, total: totalItems });

            for (let i = 0; i < totalItems; i += CHUNK_SIZE) {
                const chunk = totalPayload.slice(i, i + CHUNK_SIZE);
                const { error: rpcErr } = await supabase.rpc('bulk_upsert_stock', {
                    p_items: chunk
                });

                if (rpcErr) throw rpcErr;
                
                setProgress({ processed: Math.min(i + CHUNK_SIZE, totalItems), total: totalItems });
            }

            setSummary({
                processed: data.length - 1,
                updated: totalPayload.length,
                skipped: skippedSkus
            });
            // All successful updates are tracked in the summary state now.

            
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
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Overwrite Stock Data</h2>
                        <p className="text-xs text-slate-500 mt-1">Upload XLSX to update your warehouse inventory.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Format Guide */}
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest flex items-center gap-1">
                                <AlertCircle size={14} /> Critical: Overwrite Mode
                            </h3>
                            <button
                                onClick={handleDownloadTemplate}
                                className="text-[10px] font-bold text-amber-600 hover:text-amber-800 underline uppercase tracking-wider transition-colors"
                            >
                                Template
                            </button>
                        </div>
                        <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                            This import will **REPLACE** existing stock for specified SKUs. Headers required: <code className="bg-white/50 px-1 rounded">SKU</code>, <code className="bg-white/50 px-1 rounded">Warehouse Category</code>, <code className="bg-white/50 px-1 rounded">Warehouse Location</code>, <code className="bg-white/50 px-1 rounded">QTY</code>.
                        </p>
                    </div>

                    {!summary && (
                        <div className="relative group">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={loading}
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
                                    {file ? file.name : 'Select inventory file'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports .xlsx, .xls'}
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-2">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {summary && (
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                            <div className="flex items-center gap-3 text-emerald-600">
                                <CheckCircle2 size={24} />
                                <h3 className="font-bold text-lg">Import Successful</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-3 rounded-xl border border-slate-100">
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Updated</p>
                                    <p className="text-xl font-bold text-slate-900">{summary.updated.toLocaleString()}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-100">
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Skipped</p>
                                    <p className="text-xl font-bold text-amber-600">{summary.skipped.toLocaleString()}</p>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                {summary.skipped > 0 
                                    ? `Total of ${summary.skipped} rows were skipped because the SKUs were not found in your current catalogue.`
                                    : "All rows in the file were successfully mapped and updated."}
                            </p>
                            <button
                                onClick={() => {
                                    onSuccess();
                                    onClose();
                                }}
                                className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition"
                            >
                                Back to Inventory
                            </button>
                        </div>
                    )}

                    {progress && loading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500">
                                <span>Uploading Chunks...</span>
                                <span>{progress.processed.toLocaleString()} / {progress.total.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-indigo-600 transition-all duration-300"
                                    style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {!summary && (
                        <div className="pt-2">
                            <button
                                onClick={processExcel}
                                disabled={!file || loading}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition disabled:opacity-50 shadow-premium"
                            >
                                {loading ? (
                                    <><Loader2 className="animate-spin" size={20} /> Updating Catalog...</>
                                ) : (
                                    <><Upload size={20} /> Overwrite Stock</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
