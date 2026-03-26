import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Save, MapPin, Plus, Trash2 } from 'lucide-react';
import type { StoreSettings } from '../../types/settings';
import { useStoreSettings } from '../../features/catalogue/StoreSettingsContext';

export const AdminOfflineStoreSettings = () => {
    const { refreshSettings } = useStoreSettings();
    const [settings, setSettings] = useState<StoreSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single();
            if (error) throw error;
            setSettings(data as StoreSettings);
        } catch (err: any) {
            console.error('Error fetching settings:', err);
            setError('Failed to load settings.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;

        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const { error: updateError } = await supabase
                .from('store_settings')
                .update({
                    offline_stores: settings.offline_stores,
                    updated_at: new Date().toISOString()
                })
                .eq('id', 1);

            if (updateError) throw updateError;
            await refreshSettings();
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error('Error updating settings:', err);
            setError('Failed to save settings: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const addStore = () => {
        if (!settings) return;
        setSettings({
            ...settings,
            offline_stores: [...(settings.offline_stores || []), { name: '', address: '', maps_url: '' }]
        });
    };

    const removeStore = (index: number) => {
        if (!settings) return;
        setSettings({
            ...settings,
            offline_stores: settings.offline_stores.filter((_, i) => i !== index)
        });
    };

    const updateStore = (index: number, field: keyof StoreSettings['offline_stores'][0], value: string) => {
        if (!settings) return;
        const newStores = [...settings.offline_stores];
        newStores[index] = { ...newStores[index], [field]: value };
        setSettings({ ...settings, offline_stores: newStores });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                <p>Loading settings...</p>
            </div>
        );
    }

    if (!settings) return null;

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Physical Stores</h1>
                <p className="text-sm text-slate-500">Manage your offline store locations displayed on the About Us page.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <MapPin className="text-emerald-600" size={18} />
                            Offline Stores
                        </h2>
                        <button type="button" onClick={addStore} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-md transition-colors">
                            <Plus size={14} /> Add Location
                        </button>
                    </div>
                    <div className="p-6 space-y-6">
                        {!settings.offline_stores || settings.offline_stores.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">No offline stores added yet.</p>
                        ) : (
                            settings.offline_stores.map((store, index) => (
                                <div key={index} className="flex gap-4 items-start p-4 bg-slate-50 border border-slate-100 rounded-xl relative group">
                                    <div className="flex-1 space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Store Name</label>
                                                <input required value={store.name} onChange={(e) => updateStore(index, 'name', e.target.value)} className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-500" placeholder="e.g. BNS Hype Jakarta" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Google Maps URL</label>
                                                <input type="url" value={store.maps_url || ''} onChange={(e) => updateStore(index, 'maps_url', e.target.value)} className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-500" placeholder="https://maps.google.com/..." />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Full Address</label>
                                            <textarea required value={store.address} onChange={(e) => updateStore(index, 'address', e.target.value)} rows={2} className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-500" placeholder="Jl. Sudirman No 1..." />
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => removeStore(index)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-md transition-colors shadow-sm bg-slate-100 opacity-0 group-hover:opacity-100" title="Remove Location">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
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
