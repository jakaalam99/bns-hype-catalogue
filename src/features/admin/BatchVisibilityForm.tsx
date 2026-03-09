import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import { X, Upload, Loader2, FileDown, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface BatchVisibilityFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const BatchVisibilityForm = ({ onClose, onSuccess }: BatchVisibilityFormProps) => {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'show' | 'hide' | null>(null);
    const [results, setResults] = useState<{
        success: number;
        failed: number;
        errors: { row: number, message: string }[];
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetMode: 'show' | 'hide') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setMode(targetMode);
        setResults(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            await processVisibilityUpdate(jsonData as any[], targetMode);
        } catch (error) {
            console.error("Excel Parse Error:", error);
            setResults({
                success: 0,
                failed: 1,
                errors: [{ row: 0, message: "Failed to parse file format. Ensure it is a valid Excel file." }]
            });
            setLoading(false);
        }
    };

    const processVisibilityUpdate = async (data: any[], targetMode: 'show' | 'hide') => {
        let successCount = 0;
        let failedCount = 0;
        const errors: { row: number, message: string }[] = [];

        // Extract SKUs - looking for a 'sku' or 'SKU' column
        const skus = data
            .map((row, index) => {
                const sku = row.sku || row.SKU;
                if (!sku) {
                    errors.push({ row: index + 2, message: "Missing SKU column" });
                    failedCount++;
                    return null;
                }
                return sku.toString().trim();
            })
            .filter(Boolean) as string[];

        if (skus.length === 0) {
            setResults({ success: 0, failed: failedCount, errors });
            setLoading(false);
            return;
        }

        const isActive = targetMode === 'show';

        // Chunking the updates to avoid long URL issues or payload limits
        const chunkSize = 100;
        for (let i = 0; i < skus.length; i += chunkSize) {
            const chunk = skus.slice(i, i + chunkSize);

            try {
                const { error } = await supabase
                    .from('products')
                    .update({ is_active: isActive })
                    .in('sku', chunk);

                if (error) throw error;
                successCount += chunk.length;
            } catch (err: any) {
                console.error("Error updating batch:", err);
                errors.push({ row: i + 2, message: `Batch update failed: ${err.message}` });
                failedCount += chunk.length;
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
        const templateData = [{ sku: "SKU-001" }, { sku: "SKU-002" }];
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "SKUs");
        XLSX.writeFile(workbook, 'bns-visibility-template.xlsx');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Batch SKU Visibility</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 text-center">
                    {!results && !loading && (
                        <div className="space-y-6">
                            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm leading-relaxed flex items-start text-left gap-3">
                                <AlertCircle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold mb-1 text-amber-900">Batch Status Update</p>
                                    <p className="text-amber-800/90">
                                        Upload an Excel file with a column named <strong className="text-amber-950">SKU</strong>.
                                        All matching products will be updated to the status you choose below.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={downloadTemplate}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-2 transition-colors py-2 px-4 rounded-lg hover:bg-indigo-50 w-full"
                            >
                                <FileDown size={16} />
                                Download SKU List Template
                            </button>

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <label className="relative group cursor-pointer">
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={(e) => handleFileUpload(e, 'show')}
                                    />
                                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/30 group-hover:bg-emerald-50 transition-all group-hover:border-emerald-400">
                                        <div className="w-12 h-12 bg-white shadow-sm border border-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600 group-hover:scale-110 transition-transform">
                                            <Eye size={24} />
                                        </div>
                                        <span className="font-bold text-emerald-900">Show SKUs</span>
                                        <span className="text-xs text-emerald-600/70 mt-1">Mark as Active</span>
                                    </div>
                                </label>

                                <label className="relative group cursor-pointer">
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={(e) => handleFileUpload(e, 'hide')}
                                    />
                                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-red-200 rounded-2xl bg-red-50/30 group-hover:bg-red-50 transition-all group-hover:border-red-400">
                                        <div className="w-12 h-12 bg-white shadow-sm border border-red-100 rounded-full flex items-center justify-center mb-4 text-red-600 group-hover:scale-110 transition-transform">
                                            <EyeOff size={24} />
                                        </div>
                                        <span className="font-bold text-red-900">Hide SKUs</span>
                                        <span className="text-xs text-red-600/70 mt-1">Mark as Hidden</span>
                                    </div>
                                </label>
                            </div>

                            <p className="text-[10px] text-slate-400 mt-4 italic">
                                Note: This will affect all public catalogues immediately.
                            </p>
                        </div>
                    )}

                    {loading && (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                            <h3 className="text-lg font-semibold text-slate-900">
                                {mode === 'show' ? 'Activating SKUs...' : 'Hiding SKUs...'}
                            </h3>
                            <p className="text-slate-500 text-sm mt-2 max-w-sm">
                                Please wait while we update the visibility settings for your products.
                            </p>
                        </div>
                    )}

                    {results && !loading && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="text-xl font-bold tracking-tight text-slate-900">Batch Update Complete</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Products have been set to <strong>{mode === 'show' ? 'Visible' : 'Hidden'}</strong>.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-bold text-slate-900 mb-1">{results.success}</p>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Updated</p>
                                </div>
                                <div className={`bg-slate-50 border border-slate-200 rounded-xl p-4 text-center ${results.failed > 0 ? 'bg-red-50 border-red-100' : ''}`}>
                                    <p className={`text-3xl font-bold mb-1 ${results.failed > 0 ? 'text-red-600' : 'text-slate-900'}`}>{results.failed}</p>
                                    <p className={`text-xs font-medium uppercase tracking-wider ${results.failed > 0 ? 'text-red-500' : 'text-slate-500'}`}>Error/Skipped</p>
                                </div>
                            </div>

                            {results.errors.length > 0 && (
                                <div className="mt-6 text-left">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Error Log</h3>
                                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 max-h-40 overflow-y-auto">
                                        <ul className="space-y-1.5">
                                            {results.errors.map((err, i) => (
                                                <li key={i} className="text-xs text-red-800 flex gap-2">
                                                    <span className="font-bold opacity-50 whitespace-nowrap">ROW {err.row}:</span>
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
                        {results ? 'Done & Refresh' : 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
};
