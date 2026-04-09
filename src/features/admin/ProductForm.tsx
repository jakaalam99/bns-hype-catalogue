import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Upload, Loader2 } from 'lucide-react';
import type { ProductWithImages } from '../../types/product';
import { formatIDR } from '../../lib/utils';

interface ProductFormProps {
    onClose: () => void;
    onSuccess: () => void;
    productToEdit?: ProductWithImages | null;
}

export const ProductForm = ({ onClose, onSuccess, productToEdit }: ProductFormProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [images, setImages] = useState<File[]>([]);

    // Support keeping track of existing images during edit
    const [existingImages, setExistingImages] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        barcode: '',
        brand: '',
        category: '',
        price: ''
    });

    const [discountType, setDiscountType] = useState<'none' | 'price' | 'percentage' | 'amount'>('none');
    const [discountValue, setDiscountValue] = useState<string>('');

    useEffect(() => {
        if (productToEdit) {
            setFormData({
                name: productToEdit.name,
                sku: productToEdit.sku,
                barcode: productToEdit.barcode || '',
                brand: productToEdit.brand || '',
                category: productToEdit.category || '',
                price: productToEdit.price.toString()
            });

            if (productToEdit.discount_price) {
                setDiscountType('price');
                setDiscountValue(productToEdit.discount_price.toString());
            } else {
                setDiscountType('none');
                setDiscountValue('');
            }

            if (productToEdit.images) {
                // Keep existing images separate from new file uploads for rendering
                setExistingImages(productToEdit.images.sort((a: any, b: any) => a.display_order - b.display_order));
            }
        }
    }, [productToEdit]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            // Convert FileList to Array and append to existing images
            setImages(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = async (imageId: string, imageUrl: string) => {
        if (!window.confirm("Are you sure you want to delete this image? This action cannot be undone.")) return;

        try {
            // Delete from Storage
            const { error: storageError } = await supabase.storage.from('product-images').remove([imageUrl]);
            if (storageError) throw storageError;

            // Delete from Database
            const { error: dbError } = await supabase.from('product_images').delete().eq('id', imageId);
            if (dbError) throw dbError;

            // Update UI State
            setExistingImages(prev => prev.filter(img => img.id !== imageId));

        } catch (err: any) {
            console.error("Failed to delete image", err);
            alert("Failed to delete image: " + err.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let product;

            let finalDiscountPrice: number | null = null;
            const basePrice = parseFloat(formData.price) || 0;

            if (discountType === 'price' && discountValue) {
                finalDiscountPrice = parseFloat(discountValue);
            } else if (discountType === 'percentage' && discountValue) {
                const pct = parseFloat(discountValue);
                finalDiscountPrice = basePrice - (basePrice * pct / 100);
            } else if (discountType === 'amount' && discountValue) {
                const amt = parseFloat(discountValue);
                finalDiscountPrice = basePrice - amt;
            }

            if (finalDiscountPrice !== null && finalDiscountPrice < 0) {
                finalDiscountPrice = 0;
            }

            if (productToEdit) {
                // Update existing record
                const { data, error: productError } = await supabase
                    .from('products')
                    .update({
                        name: formData.name,
                        sku: formData.sku,
                        barcode: formData.barcode || null,
                        brand: formData.brand || null,
                        category: formData.category || null,
                        price: parseFloat(formData.price),
                        discount_price: finalDiscountPrice,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', productToEdit.id)
                    .select()
                    .single();

                if (productError) throw productError;
                product = data;

            } else {
                // Insert new record
                const { data, error: productError } = await supabase
                    .from('products')
                    .insert({
                        name: formData.name,
                        sku: formData.sku,
                        barcode: formData.barcode || null,
                        brand: formData.brand || null,
                        category: formData.category || null,
                        price: parseFloat(formData.price),
                        discount_price: finalDiscountPrice
                    })
                    .select()
                    .single();

                if (productError) throw productError;
                product = data;
            }

            // 2. Upload Images and link them
            if (images.length > 0 && product) {
                const imagePromises = images.map(async (file, index) => {
                    const fileExt = file.name.split('.').pop();
                    // Use SKU for folder naming and include secondary index + timestamp for uniqueness
                    const timestamp = Date.now();
                    const fileName = `${product.sku}/${index}_${timestamp}.${fileExt}`;
                    
                    // Upload to storage
                    const { error: uploadError } = await supabase.storage
                        .from('product-images')
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;

                    // Insert record in DB
                    return supabase.from('product_images').insert({
                        product_id: product.id,
                        image_url: fileName,
                        display_order: index
                    });
                });

                await Promise.all(imagePromises);
            }

            onSuccess();
        } catch (err: any) {
            console.error("Product creation error:", err);
            // Unique violation for SKU usually returns '23505' code in standard postgres
            if (err.code === '23505') {
                setError('A product with this SKU already exists.');
            } else {
                setError(err.message || 'Failed to create product.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">{productToEdit ? 'Edit Product' : 'Add New Product'}</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form id="product-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="col-span-1 sm:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="name">Product Name *</label>
                                <input
                                    id="name"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    placeholder="e.g. Premium Cotton T-Shirt"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="sku">SKU *</label>
                                <input
                                    id="sku"
                                    required
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none uppercase"
                                    placeholder="TSHIRT-001"
                                />
                                <p className="text-xs text-slate-500 mt-1">Must be unique.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="barcode">Barcode</label>
                                <input
                                    id="barcode"
                                    value={formData.barcode}
                                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    placeholder="Scan or enter barcode"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="brand">Brand</label>
                                <input
                                    id="brand"
                                    value={formData.brand}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    placeholder="e.g. Nike, Supreme"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="category">Category</label>
                                <input
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    placeholder="e.g. Sneakers, Apparel"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="price">Price *</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-semibold">Rp</div>
                                        <input
                                            id="price"
                                            type="number"
                                            step="any"
                                            min="0"
                                            required
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none max-w-xs"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                    <label className="block text-sm font-medium text-slate-700 mb-3">Discount Option</label>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-6 flex-wrap">
                                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="discountType"
                                                    value="none"
                                                    checked={discountType === 'none'}
                                                    onChange={(e) => setDiscountType(e.target.value as any)}
                                                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                                />
                                                <span className="font-medium">No Discount</span>
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="discountType"
                                                    value="price"
                                                    checked={discountType === 'price'}
                                                    onChange={(e) => setDiscountType(e.target.value as any)}
                                                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                                />
                                                <span className="font-medium">Discount Price</span>
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="discountType"
                                                    value="percentage"
                                                    checked={discountType === 'percentage'}
                                                    onChange={(e) => setDiscountType(e.target.value as any)}
                                                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                                />
                                                <span className="font-medium">Discounted by %</span>
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="discountType"
                                                    value="amount"
                                                    checked={discountType === 'amount'}
                                                    onChange={(e) => setDiscountType(e.target.value as any)}
                                                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                                />
                                                <span className="font-medium">Discounted by Rp</span>
                                            </label>
                                        </div>

                                        {discountType !== 'none' && (
                                            <div className="mt-2 flex items-center gap-4">
                                                <div className="relative w-full max-w-sm">
                                                    {discountType !== 'percentage' && (
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-semibold">Rp</div>
                                                    )}
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        required
                                                        value={discountValue}
                                                        onChange={(e) => setDiscountValue(e.target.value)}
                                                        className={`block w-full ${discountType !== 'percentage' ? 'pl-9' : 'pl-3'} pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none`}
                                                        placeholder={discountType === 'percentage' ? "e.g. 10 (for 10%)" : "Enter amount"}
                                                    />
                                                    {discountType === 'percentage' && (
                                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs font-semibold">%</div>
                                                    )}
                                                </div>

                                                {/* Final Price Preview */}
                                                {(() => {
                                                    let previewPrice: number | null = null;
                                                    const basePrice = parseFloat(formData.price) || 0;
                                                    if (discountValue) {
                                                        if (discountType === 'price') {
                                                            previewPrice = parseFloat(discountValue);
                                                        } else if (discountType === 'percentage') {
                                                            const pct = parseFloat(discountValue);
                                                            previewPrice = basePrice - (basePrice * pct / 100);
                                                        } else if (discountType === 'amount') {
                                                            const amt = parseFloat(discountValue);
                                                            previewPrice = basePrice - amt;
                                                        }
                                                    }

                                                    if (previewPrice !== null) {
                                                        return (
                                                            <div className="text-sm">
                                                                <span className="text-slate-500 mr-2">Final Price:</span>
                                                                <span className="font-bold text-slate-900">{formatIDR(Math.max(0, previewPrice))}</span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <label className="block text-sm font-medium text-slate-700 mb-3">Product Images</label>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                {existingImages.map((img, index) => (
                                    <div key={`existing-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                                        <img src={supabase.storage.from('product-images').getPublicUrl(img.image_url).data.publicUrl} alt="Existing" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingImage(img.id, img.image_url)}
                                            className="absolute top-2 right-2 p-1.5 bg-white/90 text-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-red-500 shadow-sm"
                                            title="Delete Image"
                                        >
                                            <X size={14} />
                                        </button>
                                        {img.display_order === 0 && (
                                            <div className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[10px] uppercase font-bold text-center py-1">
                                                Primary
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {images.map((file, index) => (
                                    <div key={`new-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                                        <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-2 right-2 p-1.5 bg-white/90 text-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-red-500 shadow-sm"
                                        >
                                            <X size={14} />
                                        </button>
                                        {existingImages.length === 0 && index === 0 && (
                                            <div className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[10px] uppercase font-bold text-center py-1">
                                                Primary
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 transition-colors flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-indigo-600">
                                    <Upload size={24} className="mb-2" />
                                    <span className="text-xs font-medium">Upload</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        multiple
                                        accept="image/png, image/jpeg, image/webp"
                                        onChange={handleImageChange}
                                    />
                                </label>
                            </div>
                            <p className="text-xs text-slate-500">First image will be used as the primary thumbnail. JPG, PNG or WEBP.</p>
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 border border-slate-200 bg-white text-slate-700 font-medium text-sm rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="product-form"
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {loading ? 'Saving...' : 'Save Product'}
                    </button>
                </div>
            </div>
        </div>
    );
};
