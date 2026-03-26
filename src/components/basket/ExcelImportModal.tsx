import { useState, useRef } from 'react';
import { X, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useBasket } from '../../features/catalogue/BasketContext';

export const ExcelImportModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
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

            // Validate columns exist
            const firstRow = rows[0];
            if (!('SKU' in firstRow) || !('Product Name' in firstRow) || !('QTY' in firstRow) || !('Destination Location' in firstRow)) {
                throw new Error("Invalid format. Required columns: SKU, Product Name, QTY, Destination Location");
            }

            // Validate Destination Locations
            const { data: locations, error: locError } = await supabase.from('destination_locations').select('name');
            if (locError) throw locError;
            const validLocations = new Set(locations.map(l => l.name));

            // Validate SKUs
            const skus = Array.from(new Set(rows.map(r => r.SKU.toString())));
            const { data: products, error: pError } = await supabase.from('products').select('*').in('sku', skus).eq('is_active', true);
            if (pError) throw pError;
            const productMap = new Map(products.map(p => [p.sku, p]));

            let successCount = 0;
            let failedRows: number[] = [];

            // Process each row
            rows.forEach((row, index) => {
                const sku = row.SKU?.toString();
                const qty = parseInt(row.QTY);
                const dest = row['Destination Location']?.toString();
                
                if (!sku || !dest || isNaN(qty) || qty <= 0 || !validLocations.has(dest) || !productMap.has(sku)) {
                    failedRows.push(index + 2); // +2 because 1-indexed and header row
                    return;
                }

                const product = productMap.get(sku);
                // The basket context currently doesn't store destination. 
                // We need to modify addToBasket to accept a destination, or store it.
                // For now, we add to basket, but wait, the prompt says Basket items need Destination Location
                // Let's add it as a property to the product object passed to addToBasket.
                const productWithDest = { ...product, destination_location: dest };
                addToBasket(productWithDest, qty);
                successCount++;
            });

            if (failedRows.length > 0) {
                setError(`Partially imported. Failed rows: ${failedRows.join(', ')}. Check SKU, QTY > 0, and exact Destination Location.`);
            } else {
                setSuccessMessage(`Successfully imported ${successCount} items!`);
                setTimeout(() => onClose(), 2000);
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Import from Excel</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
                        <p className="font-bold mb-2 text-slate-900">Required Column Headers:</p>
                        <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
                            <li>SKU</li>
                            <li>Product Name</li>
                            <li>QTY</li>
                            <li>Destination Location</li>
                        </ul>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex gap-2 items-start border border-red-100">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 bg-emerald-50 text-emerald-600 font-bold text-sm rounded-lg text-center border border-emerald-100">
                            {successMessage}
                        </div>
                    )}

                    <div className="flex justify-center">
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
                            className="w-full py-4 bg-indigo-50 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : <FileSpreadsheet size={24} />}
                            {loading ? 'Processing...' : 'Select Excel File'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
