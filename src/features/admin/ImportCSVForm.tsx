import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import { X, Upload, Loader2, FileDown, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ImportCSVFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface CSVRow {
    sku: string;
    name: string;
    price: string | number;
    discount_price?: string | number;
    discount_percentage?: string | number;
    discount_amount?: string | number;
    barcode?: string;
    brand?: string;
    category?: string;
    ip?: string;
    series_category?: string;
}

export const ImportCSVForm = ({ onClose, onSuccess }: ImportCSVFormProps) => {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{
        success: number;
        failed: number;
        errors: { row: number, sku?: string, message: string }[];
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
            await processImport(jsonData as CSVRow[]);
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

    const processImport = async (data: CSVRow[]) => {
        let successCount = 0;
        let failedCount = 0;
        const errors = [];

        // Simple chunking to avoid overwhelming the network
        const chunkSize = 100;
        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);

            // Validate & Transform chunk
            const validRecords = chunk.map((row, index) => {
                const rowIndex = i + index + 2; // +2 for humanity (1-index + header row)

                // Skip completely empty rows that Excel sometimes generates
                const isRowEmpty = Object.keys(row).length === 0 || Object.values(row).every(val => val === null || val === undefined || val === '');
                if (isRowEmpty) return null;

                if (!row.sku || !row.name || row.price === undefined || row.price === null || row.price === '') {
                    errors.push({ 
                        row: rowIndex, 
                        sku: row.sku?.toString() || 'N/A', 
                        message: `Missing required fields (sku, name, or price)` 
                    });
                    failedCount++;
                    return null;
                }

                const basePrice = parseFloat(row.price.toString());
                let methodsCount = 0;
                let finalDiscountPrice = null;

                const hasDiscountPrice = row.discount_price !== undefined && row.discount_price !== '';
                const hasDiscountPct = row.discount_percentage !== undefined && row.discount_percentage !== '';
                const hasDiscountAmt = row.discount_amount !== undefined && row.discount_amount !== '';

                if (hasDiscountPrice) methodsCount++;
                if (hasDiscountPct) methodsCount++;
                if (hasDiscountAmt) methodsCount++;

                if (methodsCount > 1) {
                    errors.push({ 
                        row: rowIndex, 
                        sku: row.sku.toString(), 
                        message: `Only ONE discount method can be filled (discount_price, discount_percentage, OR discount_amount). Found multiple.` 
                    });
                    failedCount++;
                    return null;
                }

                if (hasDiscountPrice) {
                    finalDiscountPrice = parseFloat(row.discount_price!.toString());
                } else if (hasDiscountPct) {
                    const pct = parseFloat(row.discount_percentage!.toString());
                    finalDiscountPrice = basePrice - (basePrice * pct / 100);
                } else if (hasDiscountAmt) {
                    const amt = parseFloat(row.discount_amount!.toString());
                    finalDiscountPrice = basePrice - amt;
                }

                if (finalDiscountPrice !== null && finalDiscountPrice < 0) {
                    finalDiscountPrice = 0;
                }

                return Object.keys(row).length === 0 ? null : {
                    sku: row.sku ? row.sku.toString().trim() : '',
                    name: row.name ? row.name.toString().trim() : '',
                    price: Number.isNaN(basePrice) ? 0 : basePrice,
                    discount_price: finalDiscountPrice,
                    barcode: row.barcode ? row.barcode.toString().trim() : null,
                    brand: row.brand ? row.brand.toString().trim() : null,
                    category: row.category ? row.category.toString().trim() : null,
                    ip: row.ip ? row.ip.toString().trim() : null,
                    series_category: row.series_category ? row.series_category.toString().trim() : null
                };
            }).filter(Boolean) as any[];

            if (validRecords.length > 0) {
                // Deduplicate within the batch (keep the last occurrence of a SKU) to prevent "cannot affect row a second time"
                const uniqueRecordsMap = new Map();
                for (const record of validRecords) {
                    if (record.sku && record.name && record.price > 0) {
                        uniqueRecordsMap.set(record.sku, record);
                    } else {
                        // Missing required fields after parsing (like price being 0 or NaN)
                        errors.push({ 
                            row: i + 2, 
                            sku: record.sku || 'N/A', 
                            message: `SKU ${record.sku || 'N/A'} is missing a valid Name or Price.` 
                        });
                        failedCount++;
                    }
                }

                const deduplicatedRecords = Array.from(uniqueRecordsMap.values());

                // Utilizing Upsert (ON CONFLICT SKU DO UPDATE)
                const { error } = await supabase
                    .from('products')
                    .upsert(deduplicatedRecords, { onConflict: 'sku' });

                if (error) {
                    // If batch fails, we record the error for each SKU in the batch to be explicit
                    validRecords.forEach((rec, idx) => {
                         errors.push({ 
                            row: i + idx + 2, 
                            sku: rec.sku, 
                            message: `Database error: ${error.message}` 
                        });
                    });
                    failedCount += validRecords.length;
                } else {
                    successCount += deduplicatedRecords.length;
                    
                    // Track duplicates as failed/skipped
                    if (validRecords.length > deduplicatedRecords.length) {
                        const seenSkus = new Set();
                        validRecords.forEach((rec, idx) => {
                            if (seenSkus.has(rec.sku)) {
                                errors.push({
                                    row: i + idx + 2,
                                    sku: rec.sku,
                                    message: "Duplicate SKU found in file. This row was skipped in favor of the last occurrence."
                                });
                            }
                            seenSkus.add(rec.sku);
                        });
                        failedCount += (validRecords.length - deduplicatedRecords.length);
                    }
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
            sku: "TSHIRT-001",
            barcode: "123456789",
            brand: "BNS",
            category: "Apparel",
            name: "Premium Cotton T-Shirt",
            price: 29.99,
            discount_price: 24.99,
            discount_percentage: "",
            discount_amount: "",
            ip: "IP-101",
            series_category: "FW24"
        }, {
            sku: "JEANS-002",
            barcode: "",
            brand: "Levis",
            category: "Pants",
            name: "Slim Fit Denim",
            price: 59.99,
            discount_price: "",
            discount_percentage: 10,
            discount_amount: "",
            ip: "",
            series_category: ""
        }];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, 'bns-hype-catalogue-template.xlsx');
    };

    const downloadErrorReport = () => {
        if (!results || results.errors.length === 0) return;

        const errorData = results.errors.map(err => ({
            'Row Number': err.row,
            'SKU': err.sku || 'N/A',
            'Error Message': err.message
        }));

        const worksheet = XLSX.utils.json_to_sheet(errorData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Errors");
        XLSX.writeFile(workbook, `import-errors-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Import SKUs via Excel/CSV</h2>
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
                                    <p className="font-semibold mb-1">How importing works:</p>
                                    <ul className="list-disc leading-relaxed pl-4 space-y-1 text-blue-700/90">
                                        <li>Your file must contain these headers exactly: <strong>sku, name, price</strong></li>
                                        <li>Optional discount headers: <strong>discount_price, discount_percentage, discount_amount</strong></li>
                                        <li><strong className="text-red-600">IMPORTANT:</strong> You can only fill out ONE of the discount columns. Leaving them blank means no discount.</li>
                                        <li>Optional info headers: <strong>barcode, brand, category, ip, series_category</strong></li>
                                        <li>If a SKU already exists, that product will be <strong>updated</strong>.</li>
                                        <li>If a SKU does not exist, a new product will be created.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <button
                                    onClick={downloadTemplate}
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-2 transition-colors py-2 px-4 rounded-lg hover:bg-indigo-50"
                                >
                                    <FileDown size={16} />
                                    Download Excel Template
                                </button>
                            </div>

                            <label className="border-2 border-dashed border-slate-300 rounded-2xl p-8 hover:bg-slate-50 hover:border-indigo-400 transition-colors cursor-pointer flex flex-col items-center justify-center text-center group">
                                <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all">
                                    <Upload size={28} />
                                </div>
                                <span className="text-slate-900 font-semibold mb-1">Click to browse or drag Excel/CSV file here</span>
                                <span className="text-slate-500 text-sm">Supports up to 20,000 SKUs per upload (.xlsx, .xls, .csv)</span>
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
                            <h3 className="text-lg font-semibold text-slate-900">Processing Import...</h3>
                            <p className="text-slate-500 text-sm mt-2 max-w-sm">
                                Please wait while we process your SKUs. Large files may take a moment to upsert into the database.
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
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                            <AlertCircle size={16} className="text-red-500" />
                                            Error Report ({results.errors.length})
                                        </h4>
                                        <button
                                            onClick={downloadErrorReport}
                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors py-1 px-2 rounded-md hover:bg-indigo-50 border border-transparent hover:border-indigo-100 shadow-sm"
                                        >
                                            <FileDown size={14} />
                                            Download Error List
                                        </button>
                                    </div>
                                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 max-h-64 overflow-y-auto shadow-inner">
                                        <div className="space-y-3">
                                            {results.errors.map((err, i) => (
                                                <div key={i} className="text-sm text-red-800 flex flex-col gap-0.5 border-b border-red-200/50 pb-2 last:border-0 last:pb-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold px-1.5 py-0.5 bg-red-100 rounded text-[10px] uppercase">Row {err.row}</span>
                                                        <span className="font-mono font-bold text-red-900">{err.sku || 'N/A'}</span>
                                                    </div>
                                                    <span className="text-red-700/90 leading-tight pl-0.5">{err.message}</span>
                                                </div>
                                            ))}
                                        </div>
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
