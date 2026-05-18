import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import { X, Upload, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle, Download, ArrowUpDown, Save } from 'lucide-react';
import type { ShipmentItem } from '../../types/shipment';

interface AdminShipmentSortModalProps {
    isOpen: boolean;
    onClose: () => void;
    shipmentId: string;
    items: ShipmentItem[];
    onSuccess: () => void;
}

export const AdminShipmentSortModal: React.FC<AdminShipmentSortModalProps> = ({ 
    isOpen, onClose, shipmentId, items, onSuccess 
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<{ updated: number } | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setSummary(null);
        }
    };

    const handleDownloadTemplate = () => {
        // Create a template with current items
        const data = items.map((item, idx) => ({
            'No': (idx + 1),
            'SKU': item.sku,
            'Name': item.name,
            'Current Order': item.display_order
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sort_Order');
        XLSX.writeFile(wb, 'Shipment_Sort_Template.xlsx');
    };

    const processExcel = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        try {
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws) as any[];

            if (data.length === 0) throw new Error("Excel file is empty");

            // Create a map of SKU to desired "No"
            const sortMap = new Map<string, number>();
            data.forEach(row => {
                const sku = String(row.SKU || row.sku || '').trim().toLowerCase();
                const no = parseInt(row.No || row.no || row.NO);
                if (sku && !isNaN(no)) {
                    sortMap.set(sku, no);
                }
            });

            if (sortMap.size === 0) throw new Error("No valid SKU and No pairs found.");

            // Prepare updates for ALL items in the shipment
            const updates = items.map(item => {
                const desiredNo = sortMap.get(item.sku.toLowerCase());
                return {
                    id: item.id,
                    shipment_id: item.shipment_id,
                    sku: item.sku,
                    name: item.name,
                    quantity: item.quantity,
                    srp: item.srp,
                    // If SKU found in Excel, use that No, otherwise put at the end
                    display_order: desiredNo !== undefined ? desiredNo * 10 : 999999
                };
            });

            const { error: updateError } = await supabase
                .from('shipment_items')
                .upsert(updates, { onConflict: 'id' });

            if (updateError) throw updateError;

            // Log action
            const userRes = await supabase.auth.getUser();
            await supabase.from('shipment_logs').insert([{
                shipment_id: shipmentId,
                user_id: userRes.data.user?.id,
                user_name: userRes.data.user?.user_metadata?.full_name || userRes.data.user?.email,
                user_role: userRes.data.user?.user_metadata?.role || 'USER',
                action: 'Bulk Re-order',
                details: {
                    summary: `Updated sort order for ${updates.length} items via Excel`,
                    count: updates.length
                }
            }]);

            setSummary({ updated: updates.length });
            onSuccess();
        } catch (err: any) {
            console.error('Sort import error:', err);
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
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Bulk Re-order</h2>
                        <p className="text-xs text-slate-500 mt-1">Update the display sequence using an Excel file.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {!summary && (
                        <>
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-2 text-amber-700">
                                    <AlertCircle size={16} />
                                    <span className="text-xs font-bold">How duplicates are handled</span>
                                </div>
                                <p className="text-[10px] text-amber-700 leading-relaxed italic">
                                    If multiple items have the same SKU, they will all be assigned the same order value and grouped together in the list.
                                </p>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 hover:text-amber-800 uppercase tracking-widest transition-colors"
                                >
                                    <Download size={12} /> Download Current List
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
                                            <ArrowUpDown className="text-slate-400 group-hover:text-indigo-500 transition-colors" size={32} />
                                        )}
                                    </div>
                                    <p className="font-bold text-slate-900 mb-1">
                                        {file ? file.name : 'Select sorting file'}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        File must contain 'SKU' and 'No' columns.
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
                                <h3 className="font-bold text-lg">Re-order Complete</h3>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100">
                                <p className="text-sm text-slate-600">
                                    Successfully updated the sort order for <span className="font-bold text-slate-900">{summary.updated}</span> items.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition"
                            >
                                Close
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
                                    <><Loader2 className="animate-spin" size={20} /> Updating...</>
                                ) : (
                                    <><Save size={20} /> Apply New Order</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
