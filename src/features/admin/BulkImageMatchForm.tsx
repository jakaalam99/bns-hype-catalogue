import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Upload, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useStoreSettings } from '../../features/catalogue/StoreSettingsContext';
import { applyWatermark } from '../../lib/imageProcessor';

interface BulkImageMatchFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface MatchResult {
    fileName: string;
    sku: string;
    status: 'pending' | 'success' | 'failed';
    message?: string;
}

export const BulkImageMatchForm = ({ onClose, onSuccess }: BulkImageMatchFormProps) => {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<MatchResult[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
            
            // Initialize results
            const newResults: MatchResult[] = newFiles.map(file => ({
                fileName: file.name,
                sku: file.name.split('.')[0].trim().toUpperCase(),
                status: 'pending'
            }));
            setResults(prev => [...prev, ...newResults]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setResults(prev => prev.filter((_, i) => i !== index));
    };

    const { settings } = useStoreSettings();

    const processMatches = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);

        try {
            const { data: products, error: pErr } = await supabase
                .from('products')
                .select('id, sku');
            
            if (pErr) throw pErr;

            const skuMap = new Map((products || []).map(p => [p.sku.toUpperCase(), p.id]));
            const updatedResults = [...results];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const res = updatedResults[i];
                const productId = skuMap.get(res.sku);

                if (!productId) {
                    res.status = 'failed';
                    res.message = 'SKU not found';
                    setResults([...updatedResults]);
                    continue;
                }

                try {
                    // Apply Watermark if enabled
                    let uploadFile = file;
                    if (settings?.watermark_enabled && settings?.watermark_image_url) {
                        try {
                            uploadFile = await applyWatermark(file, settings.watermark_image_url, {
                                scale: settings.watermark_size / 100,
                                opacity: settings.watermark_opacity / 100,
                                position: settings.watermark_position as any,
                                padding: settings.watermark_padding,
                                offsetX: settings.watermark_offset_x,
                                offsetY: settings.watermark_offset_y
                            });
                        } catch (error) {
                            console.error('Failed to apply watermark in bulk to', file.name, error);
                            // Fallback to original file
                            uploadFile = file;
                        }
                    }

                    const fileExt = uploadFile.name.split('.').pop();
                    const shortHash = Math.random().toString(36).substring(2, 6);
                    const fileName = `${res.sku}/${res.sku}_${i}_${shortHash}.${fileExt}`;

                    const { error: uploadErr } = await supabase.storage
                        .from('product-images')
                        .upload(fileName, uploadFile);

                    if (uploadErr) throw uploadErr;

                    // Link in DB
                    const { error: dbErr } = await supabase.from('product_images').insert({
                        product_id: productId,
                        image_url: fileName,
                        display_order: 0 // Default to primary for bulk matches? or end?
                    });

                    if (dbErr) throw dbErr;

                    res.status = 'success';
                } catch (err: any) {
                    res.status = 'failed';
                    res.message = err.message || 'Upload error';
                }
                setResults([...updatedResults]);
            }

            const successCount = updatedResults.filter(r => r.status === 'success').length;
            if (successCount > 0) {
                // We keep the results visible so the user can see what failed
            }

        } catch (err: any) {
            alert(`Process error: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <ImageIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-slate-900">Bulk Image Match</h2>
                            <p className="text-xs text-slate-500">Filenames will be matched against SKUs automatically.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {files.length === 0 ? (
                        <label className="border-2 border-dashed border-slate-200 rounded-2xl p-12 hover:bg-slate-50 hover:border-indigo-400 transition-all cursor-pointer flex flex-col items-center justify-center text-center group">
                            <Upload size={40} className="text-slate-300 group-hover:text-indigo-500 group-hover:scale-110 transition-all mb-4" />
                            <p className="font-bold text-slate-800 mb-1">Select multiple image files</p>
                            <p className="text-sm text-slate-500 max-w-xs">Filenames should exactly match the SKU (e.g. BNS-001.jpg, ITEM-X.png)</p>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{files.length} Files Selected</h3>
                                {!isProcessing && (
                                    <button 
                                        onClick={() => {setFiles([]); setResults([]);}} 
                                        className="text-xs font-bold text-red-500 hover:underline"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {results.map((res, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg overflow-hidden shrink-0">
                                                <img src={URL.createObjectURL(files[i])} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 leading-tight">{res.fileName}</p>
                                                <p className="text-[10px] font-mono text-slate-400">Target SKU: <span className="text-indigo-600">{res.sku}</span></p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            {res.status === 'success' && <CheckCircle2 className="text-emerald-500" size={18} />}
                                            {res.status === 'failed' && (
                                                <div className="flex items-center gap-1.5 text-red-500">
                                                    <AlertCircle size={14} />
                                                    <span className="text-[10px] font-bold uppercase">{res.message}</span>
                                                </div>
                                            )}
                                            {res.status === 'pending' && !isProcessing && (
                                                <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                                                    <X size={16} />
                                                </button>
                                            )}
                                            {isProcessing && res.status === 'pending' && <Loader2 className="animate-spin text-indigo-600" size={16} />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="px-6 py-2.5 border border-slate-200 bg-white text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        {results.some(r => r.status === 'success') ? 'Close & Refresh' : 'Cancel'}
                    </button>
                    {files.length > 0 && !results.every(r => r.status === 'success' || r.status === 'failed') && (
                        <button
                            onClick={processMatches}
                            disabled={isProcessing}
                            className="px-8 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <><Loader2 size={18} className="animate-spin" /> Matching...</> : 'Process Matches'}
                        </button>
                    )}
                    {results.some(r => r.status === 'success') && !isProcessing && (
                        <button
                            onClick={() => { onSuccess(); onClose(); }}
                            className="px-8 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
                        >
                            Finish
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
