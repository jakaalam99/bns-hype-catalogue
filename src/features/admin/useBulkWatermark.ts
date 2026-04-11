import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { applyWatermark } from '../../lib/imageProcessor';
import { useStoreSettings } from '../../features/catalogue/StoreSettingsContext';

export const useBulkWatermark = () => {
    const { settings } = useStoreSettings();
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [stats, setStats] = useState({ success: 0, failed: 0 });
    const [errors, setErrors] = useState<{path: string, message: string}[]>([]);

    const reprocessAll = async () => {
        if (!settings?.watermark_enabled || !settings?.watermark_image_url) {
            throw new Error('Watermark must be enabled and an asset uploaded first.');
        }

        setIsProcessing(true);
        setStats({ success: 0, failed: 0 });
        setErrors([]);

        try {
            // 1. Fetch all product images
            const { data: images, error: fetchErr } = await supabase
                .from('product_images')
                .select('*');

            if (fetchErr) throw fetchErr;

            const total = images.length;
            setProgress({ current: 0, total });

            // 2. Process in chunks to avoid memory/browser lag
            const CHUNK_SIZE = 5;
            for (let i = 0; i < images.length; i += CHUNK_SIZE) {
                const chunk = images.slice(i, i + CHUNK_SIZE);
                
                await Promise.all(chunk.map(async (imgRecord) => {
                    try {
                        const storagePath = imgRecord.image_url;

                        // a. Download original
                        const { data: blob, error: dlErr } = await supabase.storage
                            .from('product-images')
                            .download(storagePath);

                        if (dlErr) throw dlErr;

                        // b. Convert to File
                        const fileName = storagePath.split('/').pop() || 'image.jpg';
                        const file = new File([blob], fileName, { type: blob.type });

                        // c. Apply watermark
                        const brandedFile = await applyWatermark(file, settings.watermark_image_url!, {
                            scale: settings.watermark_size / 100,
                            opacity: settings.watermark_opacity / 100,
                            position: settings.watermark_position as any,
                            padding: settings.watermark_padding,
                            offsetX: settings.watermark_offset_x,
                            offsetY: settings.watermark_offset_y
                        });

                        // d. Re-upload (overwrite)
                        const { error: ulErr } = await supabase.storage
                            .from('product-images')
                            .upload(storagePath, brandedFile, { 
                                upsert: true,
                                contentType: blob.type
                            });

                        if (ulErr) throw ulErr;
                        
                        setStats(prev => ({ ...prev, success: prev.success + 1 }));
                    } catch (err: any) {
                        console.error(`Failed to process ${imgRecord.image_url}:`, err);
                        setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
                        setErrors(prev => [...prev, { 
                            path: imgRecord.image_url, 
                            message: err.message || 'Unknown error' 
                        }]);
                    } finally {
                        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
                    }
                }));
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        reprocessAll,
        isProcessing,
        progress,
        stats,
        errors
    };
};
