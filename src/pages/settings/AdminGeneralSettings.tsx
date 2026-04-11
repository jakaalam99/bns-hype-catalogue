import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Save, Store, SlidersHorizontal, Upload, RefreshCw, Play, AlertTriangle } from 'lucide-react';
import type { StoreSettings } from '../../types/settings';
import { useStoreSettings } from '../../features/catalogue/StoreSettingsContext';
import { useBulkWatermark } from '../../features/admin/useBulkWatermark';

export const AdminGeneralSettings = () => {
    const { refreshSettings } = useStoreSettings();
    const { reprocessAll, isProcessing: isReprocessing, progress, stats, errors } = useBulkWatermark();
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
                    watermark_enabled: settings.watermark_enabled,
                    watermark_image_url: settings.watermark_image_url,
                    watermark_size: settings.watermark_size,
                    watermark_position: settings.watermark_position,
                    watermark_opacity: settings.watermark_opacity,
                    watermark_padding: settings.watermark_padding,
                    watermark_offset_x: settings.watermark_offset_x,
                    watermark_offset_y: settings.watermark_offset_y,
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

                {/* Watermark Configuration */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Upload className="text-indigo-600" size={18} />
                            Watermark Configuration
                        </h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-bold text-slate-900">Automatic Product Watermarking</h3>
                                <p className="text-xs text-slate-500">Automatically embed your logo on every product image during upload.</p>
                            </div>
                            <div className="flex items-center">
                                <label className="relative inline-flex h-6 w-11 items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.watermark_enabled}
                                        onChange={(e) => setSettings({ ...settings, watermark_enabled: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>

                        {settings.watermark_enabled && (
                            <div className="space-y-8 animate-fade-in border-t border-slate-100 pt-6">
                                {/* Logo Upload */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-800 mb-4">Watermark Logo Asset</label>
                                    <div className="flex items-start gap-6">
                                        <div className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                                            {settings.watermark_image_url ? (
                                                <img src={settings.watermark_image_url} alt="Watermark" className="max-w-full max-h-full object-contain" />
                                            ) : (
                                                <Upload className="text-slate-300" size={32} />
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                                                Upload a transparent PNG logo. This will be automatically embedded on all new product images.
                                            </p>
                                            <label className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shadow-sm">
                                                {saving ? 'Uploading...' : 'Choose Logo File'}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/png"
                                                    disabled={saving}
                                                    onChange={async (e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            const file = e.target.files[0];
                                                            setSaving(true);
                                                            try {
                                                                const fileName = `assets/watermark_${Date.now()}.png`;
                                                                const { error: uploadError } = await supabase.storage
                                                                    .from('product-images')
                                                                    .upload(fileName, file);
                                                                if (uploadError) throw uploadError;

                                                                const { data: { publicUrl } } = supabase.storage
                                                                    .from('product-images')
                                                                    .getPublicUrl(fileName);

                                                                setSettings({ ...settings, watermark_image_url: publicUrl });
                                                            } catch (err: any) {
                                                                alert('Failed to upload watermark logo: ' + err.message);
                                                            } finally {
                                                                setSaving(false);
                                                            }
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Appearance Controls */}
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-sm font-bold text-slate-800">Watermark Size</label>
                                                <span className="text-xs font-mono text-indigo-600 font-bold">{settings.watermark_size}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="10" 
                                                max="80" 
                                                value={settings.watermark_size}
                                                onChange={(e) => setSettings({...settings, watermark_size: parseInt(e.target.value)})}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-2">Relative to the width of the product image.</p>
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-sm font-bold text-slate-800">Opacity</label>
                                                <span className="text-xs font-mono text-indigo-600 font-bold">{settings.watermark_opacity}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="10" 
                                                max="100" 
                                                value={settings.watermark_opacity}
                                                onChange={(e) => setSettings({...settings, watermark_opacity: parseInt(e.target.value)})}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-sm font-bold text-slate-800">Padding (Distance from edge)</label>
                                                <span className="text-xs font-mono text-indigo-600 font-bold">{settings.watermark_padding}px</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max="200" 
                                                value={settings.watermark_padding}
                                                onChange={(e) => setSettings({...settings, watermark_padding: parseInt(e.target.value)})}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-2 italic">Set to 0 to place it directly against the edge.</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <label className="text-sm font-bold text-slate-800">Vertical Offset</label>
                                                    <span className="text-xs font-mono text-indigo-600 font-bold">{settings.watermark_offset_y}px</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="-200" 
                                                    max="200" 
                                                    value={settings.watermark_offset_y}
                                                    onChange={(e) => setSettings({...settings, watermark_offset_y: parseInt(e.target.value)})}
                                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <label className="text-sm font-bold text-slate-800">Horizontal Offset</label>
                                                    <span className="text-xs font-mono text-indigo-600 font-bold">{settings.watermark_offset_x}px</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="-200" 
                                                    max="200" 
                                                    value={settings.watermark_offset_x}
                                                    onChange={(e) => setSettings({...settings, watermark_offset_x: parseInt(e.target.value)})}
                                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 italic">Use negative Vertical Offset (e.g., -20px) to push the logo even higher if your asset has built-in whitespace.</p>
                                    </div>

                                    {/* Position Grid */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-800 mb-4">Watermark Position</label>
                                        <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
                                            {[
                                                'top-left', 'top-center', 'top-right',
                                                'center-left', 'center', 'center-right',
                                                'bottom-left', 'bottom-center', 'bottom-right'
                                            ].map((pos) => (
                                                <button
                                                    key={pos}
                                                    type="button"
                                                    onClick={() => setSettings({...settings, watermark_position: pos})}
                                                    className={`aspect-square rounded-lg border-2 transition-all flex items-center justify-center ${
                                                        settings.watermark_position === pos 
                                                            ? 'border-indigo-600 bg-indigo-50 shadow-sm' 
                                                            : 'border-slate-100 bg-white hover:border-slate-300'
                                                    }`}
                                                    title={pos.replace('-', ' ')}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${
                                                        settings.watermark_position === pos ? 'bg-indigo-600' : 'bg-slate-200'
                                                    }`} />
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-4 italic uppercase tracking-wider">
                                            Currently set to: <span className="text-indigo-600 font-bold">{settings.watermark_position.replace('-', ' ')}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Maintenance & Tools */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <RefreshCw className="text-indigo-600" size={18} />
                            Maintenance & Tools
                        </h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                            <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-amber-900">Bulk Reprocessing</h3>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    This will re-apply the current watermark settings to **all existing product images**. 
                                    This process overwrites original files and cannot be undone.
                                </p>
                            </div>
                        </div>

                        {isReprocessing ? (
                            <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-pulse">
                                <div className="flex justify-between items-end mb-1">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Reprocessing Catalogue...</p>
                                        <p className="text-[10px] text-slate-500 font-mono">
                                            {progress.current} / {progress.total} Images processed
                                        </p>
                                    </div>
                                    <p className="text-lg font-black text-indigo-600 font-mono">
                                        {Math.round((progress.current / progress.total) * 100) || 0}%
                                    </p>
                                </div>
                                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                    <div 
                                        className="h-full bg-indigo-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                                <div className="flex gap-4 pt-2">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold border border-emerald-100 uppercase">
                                        Success: {stats.success}
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 rounded text-[10px] font-bold border border-red-100 uppercase">
                                        Failed: {stats.failed}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-800">Refresh Watermarks</p>
                                    <p className="text-[10px] text-slate-500">Apply current settings to all SKUs in the database.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (confirm('Are you sure you want to reprocess all images? This will overwrite the current ones.')) {
                                            reprocessAll();
                                        }
                                    }}
                                    disabled={!settings.watermark_enabled || !settings.watermark_image_url || isReprocessing}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:grayscale"
                                >
                                    <Play size={14} fill="currentColor" />
                                    Start Reprocess
                                </button>
                            </div>
                        )}

                        {errors.length > 0 && !isReprocessing && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-3">
                                <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                                    <AlertTriangle size={16} />
                                    Failed to process {errors.length} images:
                                </div>
                                <div className="max-h-[150px] overflow-auto space-y-2 pr-2 custom-scrollbar">
                                    {errors.map((err, i) => (
                                        <div key={i} className="text-[10px] p-2 bg-white rounded border border-red-50 flex justify-between gap-4">
                                            <span className="font-mono text-slate-600 truncate">{err.path}</span>
                                            <span className="text-red-500 font-medium shrink-0">{err.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {stats.success > 0 && !isReprocessing && (
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex gap-3 animate-fade-in">
                                <RefreshCw className="text-indigo-600 shrink-0 mt-0.5" size={16} />
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-indigo-900">Catalogue Refreshed!</p>
                                    <p className="text-[10px] text-indigo-700 leading-relaxed">
                                        If images still look the same, try a **Hard Refresh (Ctrl+F5)** to bypass your browser's cache.
                                    </p>
                                </div>
                            </div>
                        )}
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
