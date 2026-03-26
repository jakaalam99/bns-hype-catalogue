import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Save, Instagram, Phone, Plus, Trash2, Link as LinkIcon, Music } from 'lucide-react';
import type { StoreSettings } from '../../types/settings';
import { useStoreSettings } from '../../features/catalogue/StoreSettingsContext';

export const AdminSocialSettings = () => {
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
                    instagram_links: settings.instagram_links,
                    tiktok_links: settings.tiktok_links,
                    whatsapp_links: settings.whatsapp_links,
                    social_links: settings.social_links,
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

    // Link Handlers
    const addPlatformLink = (platform: 'instagram' | 'tiktok' | 'whatsapp') => {
        if (!settings) return;
        const field = `${platform}_links` as keyof StoreSettings;
        const currentLinks = (settings[field] as any[]) || [];
        const newItem = platform === 'whatsapp' ? { label: '', number: '' } : { label: '', url: '' };
        setSettings({ ...settings, [field]: [...currentLinks, newItem] });
    };

    const removePlatformLink = (platform: 'instagram' | 'tiktok' | 'whatsapp', index: number) => {
        if (!settings) return;
        const field = `${platform}_links` as keyof StoreSettings;
        const currentLinks = (settings[field] as any[]) || [];
        setSettings({ ...settings, [field]: currentLinks.filter((_, i) => i !== index) });
    };

    const updatePlatformLink = (platform: 'instagram' | 'tiktok' | 'whatsapp', index: number, linkField: string, value: string) => {
        if (!settings) return;
        const field = `${platform}_links` as keyof StoreSettings;
        const currentLinks = [...((settings[field] as any[]) || [])];
        currentLinks[index] = { ...currentLinks[index], [linkField]: value };
        setSettings({ ...settings, [field]: currentLinks });
    };

    const addSocialLink = () => {
        if (!settings) return;
        setSettings({
            ...settings,
            social_links: [...(settings.social_links || []), { platform: 'TikTok', url: '', is_visible: true }]
        });
    };

    const removeSocialLink = (index: number) => {
        if (!settings) return;
        setSettings({ ...settings, social_links: settings.social_links.filter((_, i) => i !== index) });
    };

    const updateSocialLink = (index: number, field: string, value: any) => {
        if (!settings) return;
        const newLinks = [...settings.social_links];
        newLinks[index] = { ...newLinks[index], [field]: value };
        setSettings({ ...settings, social_links: newLinks });
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
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Social Media Links</h1>
                <p className="text-sm text-slate-500">Manage your contact numbers and social media presences.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Contact & Socials */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Instagram className="text-pink-600" size={18} />
                            Contact & Socials
                        </h2>
                    </div>
                    <div className="p-6 space-y-8">
                        {/* Instagram Links */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Instagram size={14} className="text-pink-500" />
                                    Instagram Accounts
                                </label>
                                <button type="button" onClick={() => addPlatformLink('instagram')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                                    <Plus size={12} /> Add Account
                                </button>
                            </div>
                            <div className="space-y-3">
                                {settings.instagram_links?.map((link, idx) => (
                                    <div key={idx} className="flex gap-3 items-center">
                                        <input type="text" value={link.label} onChange={(e) => updatePlatformLink('instagram', idx, 'label', e.target.value)} placeholder="Label (e.g. @bnshype)" className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                        <input type="url" value={link.url} onChange={(e) => updatePlatformLink('instagram', idx, 'url', e.target.value)} placeholder="Instagram URL" className="flex-[2] px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                        <button type="button" onClick={() => removePlatformLink('instagram', idx)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {(!settings.instagram_links || settings.instagram_links.length === 0) && <p className="text-xs text-slate-400 italic">No Instagram accounts added.</p>}
                            </div>
                        </div>

                        {/* TikTok Links */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Music size={14} className="text-slate-900" />
                                    TikTok Accounts
                                </label>
                                <button type="button" onClick={() => addPlatformLink('tiktok')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                                    <Plus size={12} /> Add Account
                                </button>
                            </div>
                            <div className="space-y-3">
                                {settings.tiktok_links?.map((link, idx) => (
                                    <div key={idx} className="flex gap-3 items-center">
                                        <input type="text" value={link.label} onChange={(e) => updatePlatformLink('tiktok', idx, 'label', e.target.value)} placeholder="Label (e.g. @bnshype_tiktok)" className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                        <input type="url" value={link.url} onChange={(e) => updatePlatformLink('tiktok', idx, 'url', e.target.value)} placeholder="TikTok URL" className="flex-[2] px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                        <button type="button" onClick={() => removePlatformLink('tiktok', idx)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {(!settings.tiktok_links || settings.tiktok_links.length === 0) && <p className="text-xs text-slate-400 italic">No TikTok accounts added.</p>}
                            </div>
                        </div>

                        {/* WhatsApp Links */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Phone size={14} className="text-emerald-500" />
                                    WhatsApp Numbers
                                </label>
                                <button type="button" onClick={() => addPlatformLink('whatsapp')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                                    <Plus size={12} /> Add Number
                                </button>
                            </div>
                            <div className="space-y-3">
                                {settings.whatsapp_links?.map((link, idx) => (
                                    <div key={idx} className="flex gap-3 items-center">
                                        <input type="text" value={link.label} onChange={(e) => updatePlatformLink('whatsapp', idx, 'label', e.target.value)} placeholder="Label (e.g. Sales Team)" className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                        <input type="text" value={link.number} onChange={(e) => updatePlatformLink('whatsapp', idx, 'number', e.target.value)} placeholder="+62812..." className="flex-[2] px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                                        <button type="button" onClick={() => removePlatformLink('whatsapp', idx)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {(!settings.whatsapp_links || settings.whatsapp_links.length === 0) && <p className="text-xs text-slate-400 italic">No WhatsApp numbers added.</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Social Links */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <LinkIcon className="text-indigo-600" size={18} />
                            Additional Social Links
                        </h2>
                        <button type="button" onClick={addSocialLink} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-md transition-colors">
                            <Plus size={14} /> Add Social
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        {!settings.social_links || settings.social_links.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">No social links added yet.</p>
                        ) : (
                            settings.social_links.map((link, index) => (
                                <div key={index} className="flex gap-4 items-start p-4 bg-slate-50 border border-slate-100 rounded-xl relative group">
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Platform</label>
                                                <select className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-500" value={link.platform} onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}>
                                                    <option value="TikTok">TikTok</option>
                                                    <option value="Threads">Threads</option>
                                                    <option value="X">X (Twitter)</option>
                                                    <option value="Custom">Custom</option>
                                                </select>
                                            </div>
                                            {link.platform === 'Custom' && (
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-1">Custom Name</label>
                                                    <input type="text" required value={link.custom_name || ''} onChange={(e) => updateSocialLink(index, 'custom_name', e.target.value)} className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-500" placeholder="e.g. Pinterest" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">URL</label>
                                            <input type="url" required value={link.url} onChange={(e) => updateSocialLink(index, 'url', e.target.value)} className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-500" placeholder="https://..." />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-6">
                                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                            <input type="checkbox" checked={link.is_visible} onChange={(e) => updateSocialLink(index, 'is_visible', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                            Visible
                                        </label>
                                        <button type="button" onClick={() => removeSocialLink(index)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-md transition-colors shadow-sm bg-slate-100 opacity-0 group-hover:opacity-100" title="Remove Link">
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
