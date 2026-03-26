import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Save, ShoppingBag, Plus, Trash2 } from 'lucide-react';
import type { StoreSettings } from '../../types/settings';
import { useStoreSettings } from '../../features/catalogue/StoreSettingsContext';

export const AdminMarketplaceSettings = () => {
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
                    marketplace_links: settings.marketplace_links,
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

    const addMarketplaceLink = () => {
        if (!settings) return;
        setSettings({
            ...settings,
            marketplace_links: [...(settings.marketplace_links || []), { platform: 'Shopee', url: '', is_visible: true }]
        });
    };

    const removeMarketplaceLink = (index: number) => {
        if (!settings) return;
        setSettings({
            ...settings,
            marketplace_links: settings.marketplace_links.filter((_, i) => i !== index)
        });
    };

    const updateMarketplaceLink = (index: number, field: string, value: any) => {
        if (!settings) return;
        const newLinks = [...settings.marketplace_links];
        newLinks[index] = { ...newLinks[index], [field]: value };
        setSettings({ ...settings, marketplace_links: newLinks });
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
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Online Marketplaces</h1>
                <p className="text-sm text-slate-500">Manage links to your e-commerce platform storefronts.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <ShoppingBag className="text-orange-600" size={18} />
                            Marketplaces
                        </h2>
                        <button type="button" onClick={addMarketplaceLink} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-md transition-colors">
                            <Plus size={14} /> Add Marketplace
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        {!settings.marketplace_links || settings.marketplace_links.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">No marketplaces added yet.</p>
                        ) : (
                            settings.marketplace_links.map((link, index) => (
                                <div key={index} className="flex gap-4 items-start p-4 bg-slate-50 border border-slate-100 rounded-xl relative group">
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Platform</label>
                                                <select className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-500" value={link.platform} onChange={(e) => updateMarketplaceLink(index, 'platform', e.target.value)}>
                                                    <option value="Shopee">Shopee</option>
                                                    <option value="Tokopedia">Tokopedia</option>
                                                    <option value="Blibli">Blibli</option>
                                                    <option value="TikTok Shop">TikTok Shop</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            {link.platform === 'Other' && (
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-1">Custom Name</label>
                                                    <input type="text" required value={link.custom_name || ''} onChange={(e) => updateMarketplaceLink(index, 'custom_name', e.target.value)} className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-500" placeholder="e.g. Lazada" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">URL</label>
                                            <input type="url" required value={link.url} onChange={(e) => updateMarketplaceLink(index, 'url', e.target.value)} className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-500" placeholder="https://..." />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-6">
                                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                            <input type="checkbox" checked={link.is_visible} onChange={(e) => updateMarketplaceLink(index, 'is_visible', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                            Visible
                                        </label>
                                        <button type="button" onClick={() => removeMarketplaceLink(index)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-md transition-colors shadow-sm bg-slate-100 opacity-0 group-hover:opacity-100" title="Remove Link">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
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
