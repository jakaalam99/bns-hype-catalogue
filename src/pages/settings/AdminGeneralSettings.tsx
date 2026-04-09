import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Save, Store, SlidersHorizontal } from 'lucide-react';
import type { StoreSettings } from '../../types/settings';
import { useStoreSettings } from '../../features/catalogue/StoreSettingsContext';

export const AdminGeneralSettings = () => {
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
            const { data, error } = await supabase
                .from('store_settings')
                .select('*')
                .eq('id', 1)
                .single();

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
                    about_text: settings.about_text,
                    favicon_url: settings.favicon_url,
                    contact_url: settings.contact_url,
                    hide_out_of_stock: settings.hide_out_of_stock,
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
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">General Information</h1>
                <p className="text-sm text-slate-500">Manage your catalogue's basic public details.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Store className="text-indigo-600" size={18} />
                            General Settings
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">About Us Text</label>
                            <textarea
                                value={settings.about_text || ''}
                                onChange={(e) => setSettings({ ...settings, about_text: e.target.value })}
                                rows={4}
                                className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                placeholder="Write a short description about BNS HYPE..."
                            />
                            <p className="text-xs text-slate-500 mt-1">This will be displayed on the public About page.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Favicon URL (Browser Tab Icon)</label>
                            <input
                                type="url"
                                value={settings.favicon_url || ''}
                                onChange={(e) => setSettings({ ...settings, favicon_url: e.target.value })}
                                className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                placeholder="https://example.com/favicon.png"
                            />
                            <p className="text-xs text-slate-500 mt-1">Paste a URL to an image (PNG/ICO) to change your website's tab icon.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Global Contact URL</label>
                            <input
                                type="url"
                                value={settings.contact_url || ''}
                                onChange={(e) => setSettings({ ...settings, contact_url: e.target.value })}
                                className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                placeholder="https://forms.gle/..."
                            />
                            <p className="text-xs text-slate-500 mt-1">This link will be used for the "Contact us" button on product detail pages.</p>
                        </div>
                    </div>
                </div>
                
                {/* Catalogue Preferences */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <SlidersHorizontal className="text-indigo-600" size={18} />
                            Catalogue Preferences
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                            <div className="space-y-0.5">
                                <label className="text-sm font-bold text-slate-900 cursor-pointer" htmlFor="hide_out_of_stock_toggle">
                                    Hide Out-of-Stock Items
                                </label>
                                <p className="text-xs text-slate-500">Automatically hide products with zero total stock from the catalogue.</p>
                            </div>
                            <div className="flex items-center">
                                <label className="relative inline-flex h-6 w-11 items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.hide_out_of_stock}
                                        onChange={(e) => setSettings({ ...settings, hide_out_of_stock: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-6">
                    <div>
                        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
                        {success && <p className="text-sm font-medium text-emerald-600">Settings saved successfully!</p>}
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center gap-2 shadow-sm"
                    >
                        {saving ? (
                            <><Loader2 size={16} className="animate-spin" />Saving...</>
                        ) : (
                            <><Save size={16} />Save Changes</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
