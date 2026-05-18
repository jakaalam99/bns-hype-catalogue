import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import { X, Upload, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';

interface AdminShipmentImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    shipmentId: string;
    onSuccess: () => void;
}

export const AdminShipmentImportModal: React.FC<AdminShipmentImportModalProps> = ({ 
    isOpen, onClose, shipmentId, onSuccess 
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<{ 
        processed: number, 
        added: number, 
        skipped: number,
        errors: { row: number, sku?: string, message: string }[],
        warnings: { sku: string, row: number }[]
    } | null>(null);

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
            ['No', 'SKU', 'Barcode', 'Quantity', 'Qty in Carton', 'IP Name', 'Launch Week', 'Name (Optional)', 'Brand (Optional)', 'SRP (Optional)'],
            [1, 'BNS-TEST-001', '888000111', 50, 10, 'IP Alpha', 'Week 4 May 2026', '', '', ''],
            [2, 'BNS-NEW-002', '888000222', 25, 5, 'IP Beta', '', 'Cool T-Shirt', 'Hype Brand', 250000]
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Shipment_Items');
        XLSX.writeFile(wb, 'Shipment_Import_Template.xlsx');
    };
    
    const downloadErrorReport = () => {
        if (!summary || summary.errors.length === 0) return;

        const errorData = summary.errors.map(err => ({
            'Row Number': err.row,
            'SKU': err.sku || 'N/A',
            'Error Message': err.message
        }));

        const worksheet = XLSX.utils.json_to_sheet(errorData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Errors");
        XLSX.writeFile(workbook, `shipment-import-errors-${new Date().toISOString().split('T')[0]}.xlsx`);
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

            // Fetch all products in bulk to match SKUs
            const skus = data.map(row => String(row.SKU || row.sku || '').trim()).filter(Boolean);
            const { data: products } = await supabase
                .from('products')
                .select(`
                    *,
                    images:product_images(*)
                `)
                .in('sku', skus);

            const { data: existingShipmentItems } = await supabase
                .from('shipment_items')
                .select('sku')
                .eq('shipment_id', shipmentId);

            const productMap = new Map(products?.map(p => [p.sku.toLowerCase(), p]));
            const existingSkus = new Set(existingShipmentItems?.map(item => item.sku.toLowerCase()) || []);

            const itemsToAdd: any[] = [];
            const importErrors: { row: number, sku?: string, message: string }[] = [];
            const importWarnings: { sku: string, row: number }[] = [];
            let skipped = 0;
            
            data.forEach((row, index) => {
                const rowIndex = index + 2; // +2 for human readable index
                const rowSku = String(row.SKU || row.sku || '').trim();
                const qty = parseInt(row.Quantity || row.qty || row.QTY || 0);
                
                if (!rowSku) {
                    importErrors.push({ row: rowIndex, message: "Missing SKU" });
                    skipped++;
                    return;
                }
                
                if (isNaN(qty) || qty <= 0) {
                    importErrors.push({ row: rowIndex, sku: rowSku, message: `Invalid quantity: ${row.Quantity || 0}` });
                    skipped++;
                    return;
                }

                const product = productMap.get(rowSku.toLowerCase());
                
                // Construct item
                const item = {
                    shipment_id: shipmentId,
                    sku: rowSku,
                    name: row.Name || row['Name (Optional)'] || row.name || product?.name || 'Unknown Product',
                    brand: row.Brand || row['Brand (Optional)'] || row.brand || product?.brand || '',
                    barcode: row.Barcode || row.barcode || product?.barcode || '',
                    quantity: qty,
                    qty_in_carton: parseInt(row['Qty in Carton'] || row.qty_in_carton || 0),
                    ip_name: row['IP Name'] || row.ip_name || null,
                    srp: parseFloat(row.SRP || row['SRP (Optional)'] || row.srp || product?.price || 0),
                    launch_week: row['Launch Week'] || row.launch_week || null,
                    image_url: null as string | null,
                    display_order: parseInt(row.No || row.no || row.NO || (index * 10))
                };

                if (existingSkus.has(rowSku.toLowerCase())) {
                    importWarnings.push({ sku: rowSku, row: rowIndex });
                }

                // Handle Image URL
                if (product) {
                    const primaryImage = product.images?.find((img: any) => img.display_order === 0) || product.images?.[0];
                    if (primaryImage) {
                        item.image_url = supabase.storage.from('product-images').getPublicUrl(primaryImage.image_url).data.publicUrl;
                    }
                }

                itemsToAdd.push(item);
            });

            if (itemsToAdd.length === 0) {
                throw new Error("No valid items found in the file.");
            }

            const { error: insertError } = await supabase
                .from('shipment_items')
                .insert(itemsToAdd);

            if (insertError) throw insertError;

            // Log action
            const userRes = await supabase.auth.getUser();
            await supabase.from('shipment_logs').insert([{
                shipment_id: shipmentId,
                user_id: userRes.data.user?.id,
                user_name: userRes.data.user?.user_metadata?.full_name || userRes.data.user?.email,
                user_role: userRes.data.user?.user_metadata?.role || 'USER',
                action: 'Bulk Import',
                details: {
                    summary: `Imported ${itemsToAdd.length} products via Excel`,
                    count: itemsToAdd.length
                }
            }]);

            setSummary({
                processed: data.length,
                added: itemsToAdd.length,
                skipped: skipped,
                errors: importErrors,
                warnings: importWarnings
            });

        } catch (err: any) {
            console.error('Import error:', err);
            setError(err.message || 'Failed to process Excel file');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in text-left">
            <div className="bg-white rounded-[2rem] shadow-premium max-w-lg w-full overflow-hidden animate-slide-up">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Import Products</h2>
                        <p className="text-xs text-slate-500 mt-1">Upload Excel to add multiple products at once.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {!summary && (
                        <>
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex justify-between items-center">
                                <div className="flex items-center gap-2 text-indigo-700">
                                    <AlertCircle size={16} />
                                    <span className="text-xs font-bold">Use our standard format</span>
                                </div>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest transition-colors"
                                >
                                    <Download size={12} /> Template
                                </button>
                            </div>

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
                                        {file ? file.name : 'Select shipment file'}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports .xlsx, .xls'}
                                    </p>
                                </div>
                            </div>
                        </>
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
                                <h3 className="font-bold text-lg">Import Complete</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-3 rounded-xl border border-slate-100">
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Added</p>
                                    <p className="text-xl font-bold text-slate-900">{summary.added}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-100">
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Skipped</p>
                                    <p className="text-xl font-bold text-amber-600">{summary.skipped}</p>
                                </div>
                            </div>

                            {summary.warnings.length > 0 && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                    <div className="flex items-center gap-2 text-amber-800 mb-2">
                                        <AlertCircle size={16} />
                                        <h4 className="text-xs font-bold uppercase tracking-wider">Duplicate SKU Warnings ({summary.warnings.length})</h4>
                                    </div>
                                    <p className="text-[10px] text-amber-700 leading-relaxed">
                                        The following SKUs were added even though they already exist in this shipment:
                                    </p>
                                    <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
                                        {summary.warnings.map((w, idx) => (
                                            <div key={idx} className="text-[10px] font-bold text-amber-900 bg-white/50 px-2 py-1 rounded">
                                                Row {w.row}: {w.sku}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {summary.errors.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                            <AlertCircle size={14} className="text-amber-500" />
                                            Skipped Items ({summary.errors.length})
                                        </h4>
                                        <button
                                            onClick={downloadErrorReport}
                                            className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest transition-colors"
                                        >
                                            <Download size={12} /> Save List
                                        </button>
                                    </div>
                                    <div className="bg-slate-100/50 rounded-xl p-3 max-h-40 overflow-y-auto border border-slate-200/50">
                                        <div className="space-y-2">
                                            {summary.errors.map((err, i) => (
                                                <div key={i} className="text-[10px] text-slate-600 flex flex-col gap-0.5 border-b border-slate-200/50 pb-1.5 last:border-0 last:pb-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-black text-slate-400">Row {err.row}</span>
                                                        <span className="font-bold text-slate-900">{err.sku || 'N/A'}</span>
                                                    </div>
                                                    <span className="text-slate-500 italic">{err.message}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    onSuccess();
                                    onClose();
                                }}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition"
                            >
                                Done
                            </button>
                        </div>
                    )}

                    {!summary && (
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={processExcel}
                                disabled={!file || loading}
                                className="flex-[2] flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 shadow-premium"
                            >
                                {loading ? (
                                    <><Loader2 className="animate-spin" size={20} /> Processing...</>
                                ) : (
                                    <><Upload size={20} /> Import Items</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
