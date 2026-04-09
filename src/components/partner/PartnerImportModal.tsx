import { useState, useRef } from 'react';
import { X, AlertCircle, FileSpreadsheet, Loader2, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useBasket } from '../../features/catalogue/BasketContext';

export const PartnerImportModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToBasket } = useBasket();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<any>(sheet);

            if (rows.length === 0) {
                throw new Error("Excel file is empty.");
            }

            // Validate columns exist (Destination is optional for Partner)
            const firstRow = rows[0];
            const hasRequiredCols = ('SKU' in firstRow) && ('Product Name' in firstRow) && ('QTY' in firstRow);
            
            if (!hasRequiredCols) {
                throw new Error("Invalid format. Required columns: SKU, Product Name, QTY");
            }

            // Validate SKUs
            const skus = Array.from(new Set(rows.map(r => r.SKU?.toString()).filter(Boolean)));
            const { data: products, error: pError } = await supabase.from('products').select('*').in('sku', skus).eq('is_active', true);
            if (pError) throw pError;
            const productMap = new Map(products.map(p => [p.sku, p]));

            let successCount = 0;
            let failedRows: number[] = [];

            // Process each row
            rows.forEach((row, index) => {
                const sku = row.SKU?.toString();
                const qty = parseInt(row.QTY);
                
                if (!sku || isNaN(qty) || qty <= 0 || !productMap.has(sku)) {
                    failedRows.push(index + 2); // +2 because 1-indexed and header row
                    return;
                }

                const product = productMap.get(sku);
                addToBasket(product, qty);
                successCount++;
            });

            if (failedRows.length > 0) {
                setError(`Partially imported. Failed rows: ${failedRows.join(', ')}. Check SKU and QTY > 0.`);
            } else {
                setSuccessMessage(`Successfully added ${successCount} items to your draft!`);
                setTimeout(() => onClose(), 1500);
            }

        } catch (err: any) {
            console.error("Import error:", err);
            setError(err.message || "Failed to process Excel file.");
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-slate-100">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="font-display font-black text-xl text-slate-900 uppercase tracking-tight">Import Draft</h3>
                        <p className="text-xs text-slate-500 font-medium">Add multiple items via Excel</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-8 space-y-6">
                    <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 text-sm">
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-bold text-indigo-900 flex items-center gap-2">
                                <FileSpreadsheet size={16} /> 
                                Required Columns:
                            </p>
                            <button 
                                onClick={() => {
                                    const templateData = [
                                        { 'SKU': 'EXAMPLE-SKU', 'Product Name': 'Sample Product', 'QTY': 1 }
                                    ];
                                    const ws = XLSX.utils.json_to_sheet(templateData);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
                                    XLSX.writeFile(wb, 'Partner_Draft_Template.xlsx');
                                }}
                                className="text-[10px] font-black text-indigo-600 bg-white px-2 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-tighter"
                            >
                                Download Template
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono font-bold">
                            <span className="px-2 py-1 bg-white border border-indigo-200 rounded text-indigo-700">SKU</span>
                            <span className="px-2 py-1 bg-white border border-indigo-200 rounded text-indigo-700">Product Name</span>
                            <span className="px-2 py-1 bg-white border border-indigo-200 rounded text-indigo-700">QTY</span>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 text-xs rounded-xl flex gap-3 items-start border border-red-100">
                            <AlertCircle size={16} className="shrink-0" />
                            <p className="font-medium leading-relaxed">{error}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-4 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-emerald-100 italic">
                            <Check size={16} />
                            {successMessage}
                        </div>
                    )}

                    <div className="flex justify-center pt-2">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            className="w-full py-6 bg-white border-2 border-dashed border-slate-200 text-slate-500 font-bold rounded-2xl hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-3 disabled:opacity-50 group"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin text-indigo-600" size={32} />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
                                    <FileSpreadsheet size={24} className="text-slate-400 group-hover:text-indigo-600" />
                                </div>
                            )}
                            <div className="text-center">
                                <span className="block text-sm text-slate-900">{loading ? 'Processing File...' : 'Choose Excel File'}</span>
                                <span className="block text-[10px] font-medium text-slate-400 mt-1">.xlsx or .xls files only</span>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100 text-center">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Partner Drafting Tool</p>
                </div>
            </div>
        </div>
    );
};
