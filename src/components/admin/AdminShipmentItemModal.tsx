import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Loader2, Save, Search, Package, Upload, Image as ImageIcon } from 'lucide-react';
import type { ShipmentItem } from '../../types/shipment';
import { useStoreSettings } from '../../features/catalogue/StoreSettingsContext';
import { applyWatermark } from '../../lib/imageProcessor';

interface AdminShipmentItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    shipmentId: string;
    editItem: ShipmentItem | null;
    onSuccess: () => void;
    isMD?: boolean;
}

export const AdminShipmentItemModal: React.FC<AdminShipmentItemModalProps> = ({ 
    isOpen, onClose, shipmentId, editItem, onSuccess, isMD = false 
}) => {
    const [sku, setSku] = useState('');
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [barcode, setBarcode] = useState('');
    const [quantity, setQuantity] = useState<number>(0);
    const [qtyInCarton, setQtyInCarton] = useState<number>(0);
    const [ipName, setIpName] = useState('');
    const [srp, setSrp] = useState<number>(0);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [launchWeek, setLaunchWeek] = useState('');
    
    const [searching, setSearching] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Multi-image states
    const [existingImages, setExistingImages] = useState<any[]>([]);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [primaryImageUrl, setPrimaryImageUrl] = useState<string | null>(null);
    const [newPrimaryIndex, setNewPrimaryIndex] = useState<number | null>(null);
    const [existingPrimaryId, setExistingPrimaryId] = useState<string | null>(null);

    const { settings } = useStoreSettings();

    useEffect(() => {
        if (editItem) {
            setSku(editItem.sku);
            setName(editItem.name);
            setBrand(editItem.brand || '');
            setBarcode(editItem.barcode || '');
            setQuantity(editItem.quantity);
            setQtyInCarton(editItem.qty_in_carton || 0);
            setIpName(editItem.ip_name || '');
            setSrp(editItem.srp);
            setPrimaryImageUrl(editItem.image_url);
            setLaunchWeek(editItem.launch_week || '');
            
            // If editing, fetch all images from catalogue for this SKU
            if (editItem.sku) {
                fetchCatalogueImages(editItem.sku, editItem.image_url);
            }
        } else {
            setSku('');
            setName('');
            setBrand('');
            setBarcode('');
            setQuantity(0);
            setQtyInCarton(0);
            setIpName('');
            setSrp(0);
            setPrimaryImageUrl(null);
            setLaunchWeek('');
            setExistingImages([]);
            setNewImageFiles([]);
            setNewPrimaryIndex(null);
            setExistingPrimaryId(null);
        }
        setError(null);
    }, [editItem, isOpen]);

    const fetchCatalogueImages = async (skuStr: string, currentThumb: string | null) => {
        try {
            const { data: product } = await supabase
                .from('products')
                .select(`id, images:product_images(*)`)
                .eq('sku', skuStr)
                .maybeSingle();
            
            if (product?.images) {
                const sorted = product.images.sort((a: any, b: any) => a.display_order - b.display_order);
                setExistingImages(sorted);

                // Try to find which existing image matches the current thumbnail
                if (currentThumb) {
                    const bucketUrl = supabase.storage.from('product-images').getPublicUrl('').data.publicUrl;
                    const match = sorted.find((img: any) => {
                        const fullUrl = bucketUrl + img.image_url;
                        return fullUrl === currentThumb;
                    });
                    if (match) setExistingPrimaryId(match.id);
                }
            }
        } catch (err) {
            console.error("Error fetching catalogue images:", err);
        }
    };

    if (!isOpen) return null;

    const handleSkuLookup = async () => {
        if (!sku.trim()) return;
        setSearching(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('products')
                .select(`
                    *,
                    images:product_images(*)
                `)
                .eq('sku', sku.trim())
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    setError('Product not found in catalogue. You can still add it manually.');
                } else {
                    throw error;
                }
            } else if (data) {
                setName(data.name);
                setBrand(data.brand || '');
                setBarcode(data.barcode || '');
                setSrp(data.price);
                
                if (data.images) {
                    const sorted = data.images.sort((a: any, b: any) => a.display_order - b.display_order);
                    setExistingImages(sorted);
                    const primary = sorted[0];
                    if (primary) {
                        const publicUrl = supabase.storage.from('product-images').getPublicUrl(primary.image_url).data.publicUrl;
                        setPrimaryImageUrl(publicUrl);
                        setExistingPrimaryId(primary.id);
                    }
                }
            }
        } catch (err: any) {
            console.error('Lookup error:', err);
            setError('Error searching for SKU.');
        } finally {
            setSearching(false);
        }
    };
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setError(null);

        const newFiles: File[] = [];

        try {
            for (const file of Array.from(files)) {
                // Apply Watermark if enabled
                let uploadFile = file;
                if (settings?.watermark_enabled && settings?.watermark_image_url) {
                    try {
                        uploadFile = await applyWatermark(file, settings.watermark_image_url, {
                            scale: (settings.watermark_size || 50) / 100,
                            opacity: (settings.watermark_opacity || 50) / 100,
                            position: (settings.watermark_position || 'center') as any,
                            padding: settings.watermark_padding || 20,
                            offsetX: settings.watermark_offset_x || 0,
                            offsetY: settings.watermark_offset_y || 0
                        });
                    } catch (error) {
                        console.error('Failed to apply watermark:', error);
                        uploadFile = file; // Fallback
                    }
                }
                newFiles.push(uploadFile);
            }

            setNewImageFiles(prev => [...prev, ...newFiles]);
            
            // If no primary is set, set the first of new files as primary
            if (!primaryImageUrl && !newPrimaryIndex && !existingPrimaryId && newFiles.length > 0) {
                setNewPrimaryIndex(newImageFiles.length); // The first of the new batch
            }
        } catch (err: any) {
            console.error('Upload error:', err);
            setError('Failed to process images.');
        } finally {
            setUploading(false);
        }
    };

    const removeExistingImage = async (imageId: string, imageUrl: string) => {
        if (!window.confirm("Delete this image from catalogue?")) return;
        try {
            await supabase.storage.from('product-images').remove([imageUrl]);
            await supabase.from('product_images').delete().eq('id', imageId);
            setExistingImages(prev => prev.filter(img => img.id !== imageId));
            if (existingPrimaryId === imageId) {
                setExistingPrimaryId(null);
                setPrimaryImageUrl(null);
            }
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const removeNewImage = (index: number) => {
        setNewImageFiles(prev => prev.filter((_, i) => i !== index));
        if (newPrimaryIndex === index) {
            setNewPrimaryIndex(null);
            setPrimaryImageUrl(null);
        } else if (newPrimaryIndex !== null && newPrimaryIndex > index) {
            setNewPrimaryIndex(newPrimaryIndex - 1);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            // 1. Upload new images if any
            const uploadedPublicUrls: string[] = [];
            const uploadedRelativePaths: string[] = [];

            for (let i = 0; i < newImageFiles.length; i++) {
                const file = newImageFiles[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${sku || 'shipment'}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
                const folder = sku ? sku.trim() : 'shipment-images';
                const filePath = `${folder}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
                uploadedPublicUrls.push(publicUrl);
                uploadedRelativePaths.push(filePath);

                // If this new image was selected as primary
                if (newPrimaryIndex === i) {
                    setPrimaryImageUrl(publicUrl);
                }
            }

            // 2. Determine final primary image URL for shipment_items
            let finalImageUrl = primaryImageUrl;
            if (newPrimaryIndex !== null && uploadedPublicUrls[newPrimaryIndex]) {
                finalImageUrl = uploadedPublicUrls[newPrimaryIndex];
            } else if (existingPrimaryId) {
                const primary = existingImages.find(img => img.id === existingPrimaryId);
                if (primary) {
                    finalImageUrl = supabase.storage.from('product-images').getPublicUrl(primary.image_url).data.publicUrl;
                }
            } else if (uploadedPublicUrls.length > 0) {
                finalImageUrl = uploadedPublicUrls[0];
            }

            const payload = {
                shipment_id: shipmentId,
                sku: sku.trim(),
                name: name.trim(),
                brand: brand.trim(),
                barcode: barcode.trim(),
                quantity,
                qty_in_carton: qtyInCarton,
                ip_name: ipName.trim(),
                srp,
                image_url: finalImageUrl,
                launch_week: launchWeek.trim()
            };

            if (editItem) {
                const { error } = await supabase.from('shipment_items').update(payload).eq('id', editItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('shipment_items').insert([payload]);
                if (error) throw error;
            }

            // 3. Sync all new images to Admin Products Catalogue
            if (uploadedRelativePaths.length > 0) {
                const { data: product } = await supabase.from('products').select('id').eq('sku', sku.trim()).maybeSingle();
                if (product) {
                    const { count: currentCount } = await supabase
                        .from('product_images')
                        .select('*', { count: 'exact', head: true })
                        .eq('product_id', product.id);
                    
                    const imageInserts = uploadedRelativePaths.map((path, idx) => {
                        let displayOrder = (currentCount || 0) + idx + 1;
                        if (newPrimaryIndex === idx) displayOrder = 0;
                        return {
                            product_id: product.id,
                            image_url: path,
                            display_order: displayOrder
                        };
                    });

                    // If we set a new primary, we should demote others
                    if (newPrimaryIndex !== null) {
                        await supabase.from('product_images').update({ display_order: 1 }).eq('product_id', product.id);
                    }

                    await supabase.from('product_images').insert(imageInserts);
                }
            } else if (existingPrimaryId && isMD) {
                // If user just changed the primary among existing images
                const { data: product } = await supabase.from('products').select('id').eq('sku', sku.trim()).maybeSingle();
                if (product) {
                    await supabase.from('product_images').update({ display_order: 1 }).eq('product_id', product.id);
                    await supabase.from('product_images').update({ display_order: 0 }).eq('id', existingPrimaryId);
                }
            }

            // 4. Log action
            const changes: any = {
                sku: sku.trim(),
                name: name.trim()
            };

            if (editItem) {
                const diffs: string[] = [];
                if (editItem.quantity !== quantity) diffs.push(`Qty: ${editItem.quantity} → ${quantity}`);
                if (editItem.qty_in_carton !== qtyInCarton) diffs.push(`Carton Qty: ${editItem.qty_in_carton} → ${qtyInCarton}`);
                if (editItem.ip_name !== ipName.trim()) diffs.push(`IP Name: "${editItem.ip_name || 'None'}" → "${ipName.trim() || 'None'}"`);
                if (editItem.srp !== srp) diffs.push(`SRP: ${editItem.srp} → ${srp}`);
                if (editItem.launch_week !== launchWeek.trim()) diffs.push(`Week: "${editItem.launch_week || 'None'}" → "${launchWeek.trim() || 'None'}"`);
                
                changes.diffs = diffs;
            } else {
                changes.quantity = quantity;
            }

            await supabase.from('shipment_logs').insert([{
                shipment_id: shipmentId,
                user_id: (await supabase.auth.getUser()).data.user?.id,
                user_name: (await supabase.auth.getUser()).data.user?.user_metadata?.full_name || (await supabase.auth.getUser()).data.user?.email,
                user_role: (await supabase.auth.getUser()).data.user?.user_metadata?.role || 'USER',
                action: editItem ? 'Update Item' : 'Add Item',
                details: changes
            }]);

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Save error:', err);
            setError(err.message || 'Failed to save product to shipment.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-premium max-w-2xl w-full overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight text-left">
                            {editItem ? 'Edit Product' : 'Add Product to Shipment'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 text-left">Enter product details for this shipment.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* SKU Lookup */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 text-left">SKU</label>
                            <div className="flex gap-2">
                                <input
                                    required
                                    disabled={!isMD}
                                    type="text"
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                    className={`flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono ${!isMD ? 'opacity-60 cursor-not-allowed' : ''}`}
                                />
                                {isMD && (
                                    <button
                                        type="button"
                                        onClick={handleSkuLookup}
                                        disabled={searching || !sku.trim()}
                                        className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition disabled:opacity-50"
                                    >
                                        {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 text-left">Barcode</label>
                            <input
                                disabled={!isMD}
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 ${!isMD ? 'opacity-60 cursor-not-allowed' : ''}`}
                            />
                        </div>

                        <div className="sm:col-span-2 space-y-2">
                            <label className="block text-sm font-bold text-slate-700 text-left">Product Name</label>
                            <input
                                required
                                disabled={!isMD}
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 ${!isMD ? 'opacity-60 cursor-not-allowed' : ''}`}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 text-left">Brand</label>
                            <input
                                disabled={!isMD}
                                type="text"
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 ${!isMD ? 'opacity-60 cursor-not-allowed' : ''}`}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 text-left">SRP (Price)</label>
                            <input
                                required
                                disabled={!isMD}
                                type="number"
                                value={srp}
                                onChange={(e) => setSrp(Number(e.target.value))}
                                className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 ${!isMD ? 'opacity-60 cursor-not-allowed' : ''}`}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 text-left">Quantity</label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 text-left">Qty in Carton</label>
                            <input
                                type="number"
                                value={qtyInCarton}
                                onChange={(e) => setQtyInCarton(Number(e.target.value))}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 text-left">IP Name</label>
                            <input
                                type="text"
                                placeholder="e.g. IP Alpha"
                                value={ipName}
                                onChange={(e) => setIpName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 text-left">Launch Week</label>
                            <input
                                type="text"
                                placeholder="e.g. Week 4 April 2026"
                                value={launchWeek}
                                onChange={(e) => setLaunchWeek(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-slate-700 text-left">Product Images</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {/* Existing Images */}
                            {existingImages.map((img) => (
                                <div key={img.id} className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${existingPrimaryId === img.id ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg' : 'border-slate-200 group'}`}>
                                    <img src={supabase.storage.from('product-images').getPublicUrl(img.image_url).data.publicUrl} alt="Existing" className="w-full h-full object-cover" />
                                    
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    
                                    {isMD && (
                                        <button
                                            type="button"
                                            onClick={() => removeExistingImage(img.id, img.image_url)}
                                            className="absolute top-2 right-2 p-1.5 bg-white/90 text-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-red-500 shadow-sm"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}

                                    {existingPrimaryId === img.id ? (
                                        <div className="absolute bottom-0 inset-x-0 bg-indigo-600 text-white text-[9px] uppercase font-black text-center py-1 tracking-widest">
                                            Thumbnail
                                        </div>
                                    ) : isMD && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setExistingPrimaryId(img.id);
                                                setNewPrimaryIndex(null);
                                            }}
                                            className="absolute bottom-2 inset-x-2 py-1.5 bg-white/90 hover:bg-white text-indigo-600 text-[10px] font-bold uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-indigo-100"
                                        >
                                            Use as Thumbnail
                                        </button>
                                    )}
                                </div>
                            ))}

                            {/* New Images */}
                            {newImageFiles.map((file, index) => (
                                <div key={`new-${index}`} className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${newPrimaryIndex === index ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg' : 'border-slate-200 group'}`}>
                                    <img src={URL.createObjectURL(file)} alt="New" className="w-full h-full object-cover" />
                                    
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                                    <button
                                        type="button"
                                        onClick={() => removeNewImage(index)}
                                        className="absolute top-2 right-2 p-1.5 bg-white/90 text-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-red-500 shadow-sm"
                                    >
                                        <X size={14} />
                                    </button>

                                    {newPrimaryIndex === index ? (
                                        <div className="absolute bottom-0 inset-x-0 bg-indigo-600 text-white text-[9px] uppercase font-black text-center py-1 tracking-widest">
                                            Thumbnail
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNewPrimaryIndex(index);
                                                setExistingPrimaryId(null);
                                            }}
                                            className="absolute bottom-2 inset-x-2 py-1.5 bg-white/90 hover:bg-white text-indigo-600 text-[10px] font-bold uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-indigo-100"
                                        >
                                            Use as Thumbnail
                                        </button>
                                    )}
                                </div>
                            ))}

                            {/* Upload Button */}
                            {isMD && (
                                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 transition-colors flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-indigo-600">
                                    {uploading ? (
                                        <Loader2 size={24} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Upload size={24} className="mb-2" />
                                            <span className="text-xs font-medium">Add Images</span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        className="hidden"
                                        multiple
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 text-left">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-2 py-3 px-8 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 shadow-premium flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {editItem ? 'Save Changes' : 'Add to Shipment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
