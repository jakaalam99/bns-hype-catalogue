import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import { X, Upload, Loader2, FileDown, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ImportStockCSVFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface StockRow {
    [key: string]: any;
    'Warehouse Name'?: string;
    'SKU'?: string;
    'Quantity'?: string | number;
}

export const ImportStockCSVForm = ({ onClose, onSuccess }: ImportStockCSVFormProps) => {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{
        success: number;
        failed: number;
        errors: { row: number, message: string }[];
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setResults(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            await processImport(jsonData as StockRow[]);
        } catch (error) {
            console.error("Excel/CSV Parse Error:", error);
            setResults({
                success: 0,
                failed: 1,
                errors: [{ row: 0, message: "Failed to parse file format. Ensure it is a valid Excel or CSV file." }]
            });
            setLoading(false);
        }
    };

    const processImport = async (data: StockRow[]) => {
        let successCount = 0;
        let failedCount = 0;
        const errors = [];

        // 1. Gather all unique warehouses from the file
        const uniqueWarehouseNames = new Set<string>();
        data.forEach(row => {
            const wName = row['Warehouse Name'] || row.warehouse || row.Warehouse;
            if (wName) uniqueWarehouseNames.add(wName.toString().trim());
        });

        // 2. Ensure warehouses exist in DB (upsert them)
        const warehouseMap = new Map<string, string>(); // name -> id
        try {
            for (const name of Array.from(uniqueWarehouseNames)) {
                // Upsert doesn't easily return the ID if we just ON CONFLICT DO NOTHING in standard supabase without rpc
                // Let's try select first, then insert. Not the absolute fastest but safe for small number of warehouses.
                let { data: wData } = await supabase.from('warehouses').select('id').eq('name', name).maybeSingle();
                
                if (!wData) {
                    const { data: newW, error: wErr } = await supabase.from('warehouses').insert({ name }).select('id').single();
                    if (wErr) throw new Error(`Failed to create warehouse ${name}: ${wErr.message}`);
                    wData = newW;
                }
                
                if (wData) {
                    warehouseMap.set(name, wData.id);
                }
            }
        } catch (err: any) {
             setResults({
                success: 0,
                failed: data.length,
                errors: [{ row: 0, message: `Warehouse setup failed: ${err.message}` }]
            });
            setLoading(false);
            return;
        }

        // 3. Process stock rows in chunks
        const chunkSize = 100;
        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);

            // Fetch product IDs for all SKUs in this chunk
            const skusInChunk = chunk.map(r => (r['SKU'] || r.sku || '').toString().trim()).filter(Boolean);
            const { data: productsData, error: pErr } = await supabase
                .from('products')
                .select('id, sku')
                .in('sku', skusInChunk);

            if (pErr) {
                errors.push({ row: i+2, message: `Failed to fetch products for chunk: ${pErr.message}` });
                failedCount += chunk.length;
                continue;
            }

            const productMap = new Map<string, string>();
            productsData?.forEach(p => productMap.set(p.sku, p.id));

            // Prepare records for upsert
            const validRecords = chunk.map((row, index) => {
                const rowIndex = i + index + 2;
                
                const wNameRaw = row['Warehouse Name'] || row.warehouse || row.Warehouse;
                const skuRaw = row['SKU'] || row.sku;
                const qtyRaw = row['Quantity'] || row.quantity || row.qty;

                const isRowEmpty = !wNameRaw && !skuRaw && qtyRaw === undefined;
                if (isRowEmpty) return null;

                if (!wNameRaw || !skuRaw || qtyRaw === undefined || qtyRaw === '') {
                     errors.push({ row: rowIndex, message: `Missing required fields (Warehouse Name, SKU, or Quantity)` });
                     failedCount++;
                     return null;
                }

                const wName = wNameRaw.toString().trim();
                const sku = skuRaw.toString().trim();
                const quantity = parseInt(qtyRaw.toString(), 10);

                if (isNaN(quantity) || quantity < 0) {
                     errors.push({ row: rowIndex, message: `Invalid quantity for SKU ${sku}` });
                     failedCount++;
                     return null;
                }

                const warehouseId = warehouseMap.get(wName);
                const productId = productMap.get(sku);

                if (!warehouseId) {
                    errors.push({ row: rowIndex, message: `Internal error resolving Warehouse ID for ${wName}` });
                    failedCount++;
                    return null;
                }

                if (!productId) {
                    errors.push({ row: rowIndex, message: `SKU not found in database: ${sku}` });
                    failedCount++;
                    return null;
                }

                return {
                    product_id: productId,
                    warehouse_id: warehouseId,
                    quantity: quantity,
                    updated_at: new Date().toISOString()
                };
            }).filter(Boolean) as any[];

            if (validRecords.length > 0) {
                 // Deduplicate within chunk: last one wins
                 const uniqueMap = new Map();
                 validRecords.forEach(r => {
                     uniqueMap.set(`${r.product_id}-${r.warehouse_id}`, r);
                 });
                 const deduplicated = Array.from(uniqueMap.values());

                 // Upsert
                 const { error } = await supabase
                    .from('warehouse_stocks')
                    .upsert(deduplicated, { onConflict: 'product_id,warehouse_id' });

                 if (error) {
                    errors.push({ row: i + 2, message: `Batch upsert failed: ${error.message}` });
                    failedCount += validRecords.length;
                 } else {
                    successCount += deduplicated.length;
                    failedCount += (validRecords.length - deduplicated.length);
                 }
            }
        }

        setResults({
            success: successCount,
            failed: failedCount,
            errors
        });
        setLoading(false);
    };

    const downloadTemplate = () => {
        const templateData = [{
            "Warehouse Name": "Jakarta Central",
            "SKU": "TSHIRT-001",
            "Quantity": 50
        }, {
            "Warehouse Name": "Bali Hub",
            "SKU": "JEANS-002",
            "Quantity": 15
        }];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Upload");
        XLSX.writeFile(workbook, 'bns-hype-stock-template.xlsx');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Import Stock via Excel/CSV</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {!results && !loading && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm leading-relaxed flex items-start gap-3">
                                <AlertCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold mb-1">How stock importing works:</p>
                                    <ul className="list-disc leading-relaxed pl-4 space-y-1 text-blue-700/90">
                                        <li>Your file must contain exactly these headers: <strong>Warehouse Name, SKU, Quantity</strong>.</li>
                                        <li>SKUs must already exist in the Products list.</li>
                                        <li>If a Warehouse Name is new, it will be automatically created.</li>
                                        <li>Uploading a SKU/Warehouse combination again will <strong>overwrite</strong> the quantity.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <button
                                    onClick={downloadTemplate}
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-2 transition-colors py-2 px-4 rounded-lg hover:bg-indigo-50"
                                >
                                    <FileDown size={16} />
                                    Download Template
                                </button>
                            </div>

                            <label className="border-2 border-dashed border-slate-300 rounded-2xl p-8 hover:bg-slate-50 hover:border-indigo-400 transition-colors cursor-pointer flex flex-col items-center justify-center text-center group">
                                <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all">
                                    <Upload size={28} />
                                </div>
                                <span className="text-slate-900 font-semibold mb-1">Click to browse or drag Excel/CSV file here</span>
                                <span className="text-slate-500 text-sm">Update inventory quantities across warehouses</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                />
                            </label>
                        </div>
                    )}

                    {loading && (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                            <h3 className="text-lg font-semibold text-slate-900">Processing Stock...</h3>
                            <p className="text-slate-500 text-sm mt-2 max-w-sm">
                                Please wait while we update inventory levels.
                            </p>
                        </div>
                    )}

                    {results && !loading && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="text-xl font-bold tracking-tight text-slate-900">Import Complete</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-bold text-slate-900 mb-1">{results.success}</p>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Successful</p>
                                </div>
                                <div className={`bg-slate-50 border border-slate-200 rounded-xl p-4 text-center ${results.failed > 0 ? 'bg-red-50 border-red-100' : ''}`}>
                                    <p className={`text-3xl font-bold mb-1 ${results.failed > 0 ? 'text-red-600' : 'text-slate-900'}`}>{results.failed}</p>
                                    <p className={`text-xs font-medium uppercase tracking-wider ${results.failed > 0 ? 'text-red-500' : 'text-slate-500'}`}>Failed</p>
                                </div>
                            </div>

                            {results.errors.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="font-semibold text-slate-900 mb-3 text-sm flex items-center gap-2">
                                        <AlertCircle size={16} className="text-red-500" />
                                        Error Report ({results.errors.length})
                                    </h4>
                                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 max-h-48 overflow-y-auto">
                                        <ul className="space-y-2">
                                            {results.errors.map((err, i) => (
                                                <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                                                    <span className="font-medium min-w-[50px]">— Row {err.row}:</span>
                                                    <span>{err.message}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={() => {
                            if (results && results.success > 0) {
                                onSuccess();
                            } else {
                                onClose();
                            }
                        }}
                        disabled={loading}
                        className="px-6 py-2 bg-slate-900 text-white font-medium text-sm rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-70"
                    >
                        {results ? 'Close & Refresh' : 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
};
