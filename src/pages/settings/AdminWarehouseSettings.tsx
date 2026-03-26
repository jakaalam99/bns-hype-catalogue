import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Save, Store } from 'lucide-react';
import type { Warehouse } from '../../types/warehouse';

export const AdminWarehouseSettings = () => {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        setLoading(true);
        try {
            const { data: wData, error: wError } = await supabase
                .from('warehouses')
                .select('*')
                .order('name');
            if (wError) throw wError;
            setWarehouses(wData as Warehouse[]);
        } catch (err: any) {
            console.error('Error fetching warehouses:', err);
            setError('Failed to load warehouses.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            if (warehouses.length > 0) {
                const { error: wUpdateError } = await supabase
                    .from('warehouses')
                    .upsert(warehouses.map(w => ({ id: w.id, name: w.name, is_visible: w.is_visible })));
                if (wUpdateError) throw wUpdateError;
            }
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error('Error updating warehouses:', err);
            setError('Failed to save settings: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleWarehouseVisibility = (id: string) => {
        setWarehouses(warehouses.map(w => w.id === id ? { ...w, is_visible: !w.is_visible } : w));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                <p>Loading warehouses...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Warehouse Visibility</h1>
                <p className="text-sm text-slate-500">Control which warehouses show up as "Available In" on the product detail pages.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Store className="text-blue-600" size={18} />
                            Warehouse List
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-slate-500 mb-4">
                            These warehouses are created automatically when you upload stock via Excel in the Products page. Toggle visibility here.
                        </p>
                        {warehouses.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">No warehouses have been created yet. Import stock via Excel to create warehouses.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {warehouses.map(w => (
                                    <div key={w.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                                        <span className="text-sm font-medium text-slate-700">{w.name}</span>
                                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={w.is_visible}
                                                onChange={() => toggleWarehouseVisibility(w.id)}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            Visible
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-6">
                    <div>
                        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
                        {success && <p className="text-sm font-medium text-emerald-600">Settings saved successfully!</p>}
                    </div>
                    <button type="submit" disabled={saving} className="px-6 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center gap-2 shadow-sm">
                        {saving ? <><Loader2 size={16} className="animate-spin" />Saving...</> : <><Save size={16} />Save Changes</>}
                    </button>
                </div>
            </form>
        </div>
    );
};
