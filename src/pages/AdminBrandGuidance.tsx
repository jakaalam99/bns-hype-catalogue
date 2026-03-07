import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Trash2, FileText, Upload, Tag, ChevronRight, GripVertical, X } from 'lucide-react';
import type { BrandGuidance as BrandGuidanceType, BrandGuidanceFile } from '../types/brandGuidance';

export const AdminBrandGuidance = () => {
    const [brands, setBrands] = useState<BrandGuidanceType[]>([]);
    const [existingProductBrands, setExistingProductBrands] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBrand, setSelectedBrand] = useState<BrandGuidanceType | null>(null);
    const [newBrandName, setNewBrandName] = useState('');
    const [isAddingBrand, setIsAddingBrand] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchBrands();
        fetchExistingProductBrands();
    }, []);

    const fetchExistingProductBrands = async () => {
        try {
            const { data } = await supabase
                .from('products')
                .select('brand')
                .not('brand', 'is', null);

            if (data) {
                const uniqueBrands = Array.from(new Set(data.map(p => p.brand))).sort();
                setExistingProductBrands(uniqueBrands);
            }
        } catch (err) {
            console.error('Error fetching existing brands:', err);
        }
    };

    const fetchBrands = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('brand_guidance')
                .select('*, files:brand_guidance_files(*)')
                .order('display_order', { ascending: true });

            if (fetchError) {
                if (fetchError.code === 'PGRST116' || fetchError.message.includes('not found')) {
                    setError('Database tables missing. Please run the SQL script in walkthrough.md');
                } else {
                    throw fetchError;
                }
            }
            setBrands(data || []);
        } catch (error: any) {
            console.error('Error fetching brands:', error);
            setError(error.message || 'Failed to fetch brands');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBrand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBrandName.trim()) return;

        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('brand_guidance')
                .insert([{ name: newBrandName, display_order: brands.length }])
                .select()
                .single();

            if (error) throw error;
            setBrands([...brands, { ...data, files: [] }]);
            setNewBrandName('');
            setIsAddingBrand(false);
        } catch (error) {
            console.error('Error adding brand:', error);
            alert('Failed to add brand');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBrand = async (id: string) => {
        if (!confirm('Are you sure you want to delete this brand and all its files?')) return;

        try {
            const { error } = await supabase
                .from('brand_guidance')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setBrands(brands.filter(b => b.id !== id));
            if (selectedBrand?.id === id) setSelectedBrand(null);
        } catch (error) {
            console.error('Error deleting brand:', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isThumbnail: boolean = false, existingFileId?: string) => {
        if (!selectedBrand || !e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const folder = isThumbnail ? 'thumbnails' : 'docs';
        const fileName = `${selectedBrand.id}/${folder}/${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('brand-guidance')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            if (isThumbnail && existingFileId) {
                // Update existing record with thumbnail
                const { error: dbError } = await supabase
                    .from('brand_guidance_files')
                    .update({ thumbnail_path: filePath })
                    .eq('id', existingFileId);

                if (dbError) throw dbError;
            } else if (!isThumbnail) {
                // 2. Add to Database as new file
                const { data, error: dbError } = await supabase
                    .from('brand_guidance_files')
                    .insert([{
                        brand_id: selectedBrand.id,
                        file_name: file.name,
                        file_path: filePath,
                        display_order: (selectedBrand.files?.length || 0)
                    }])
                    .select()
                    .single();

                if (dbError) throw dbError;

                // Update local state for brand list
                setBrands(brands.map(b => {
                    if (b.id === selectedBrand.id) {
                        return { ...b, files: [...(b.files || []), data] };
                    }
                    return b;
                }));
            }

            // Refresh selected brand
            const { data: updatedBrand, error: refreshError } = await supabase
                .from('brand_guidance')
                .select('*, files:brand_guidance_files(*)')
                .eq('id', selectedBrand.id)
                .single();

            if (refreshError) throw refreshError;
            setSelectedBrand(updatedBrand);

        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteFile = async (file: BrandGuidanceFile) => {
        if (!confirm('Delete this file?')) return;

        try {
            // 1. Delete from Storage
            const filesToRemove = [file.file_path];
            if (file.thumbnail_path) filesToRemove.push(file.thumbnail_path);

            await supabase.storage
                .from('brand-guidance')
                .remove(filesToRemove);

            // 2. Delete from Database
            await supabase
                .from('brand_guidance_files')
                .delete()
                .eq('id', file.id);

            // Update local state
            const updatedBrands = brands.map(b => {
                if (b.id === file.brand_id) {
                    const newFiles = (b.files || []).filter(f => f.id !== file.id);
                    const updatedBrand = { ...b, files: newFiles };
                    if (selectedBrand?.id === b.id) setSelectedBrand(updatedBrand);
                    return updatedBrand;
                }
                return b;
            });
            setBrands(updatedBrands);
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                <p>Loading brand guidance...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl">
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-4 text-red-700 animate-fade-in">
                    <X className="flex-shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="font-bold text-sm">Action Required</p>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Brand Guidance</h1>
                    <p className="text-sm text-slate-500">Manage brands and their official documentation materials (PDFs).</p>
                </div>
                <button
                    onClick={() => setIsAddingBrand(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
                >
                    <Plus size={18} />
                    Add Brand
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
                {/* Brand List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-800 flex items-center gap-2">
                        <GripVertical size={16} className="text-slate-400" />
                        Brands
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                        {isAddingBrand && (
                            <form onSubmit={handleAddBrand} className="p-4 bg-indigo-50/50 space-y-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-400 mb-1">Brand Name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        list="product-brands"
                                        value={newBrandName}
                                        onChange={(e) => setNewBrandName(e.target.value)}
                                        placeholder="Enter brand name..."
                                        className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <datalist id="product-brands">
                                        {existingProductBrands.map(b => (
                                            <option key={b} value={b} />
                                        ))}
                                    </datalist>
                                    <p className="text-[10px] text-indigo-400 mt-2 italic">You can select an existing product brand from the list or type a new one.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-indigo-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {saving ? 'Adding...' : 'Save'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingBrand(false)}
                                        className="flex-1 bg-white border border-slate-200 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                        {brands.map((brand) => (
                            <div
                                key={brand.id}
                                onClick={() => setSelectedBrand(brand)}
                                className={`group p-4 flex items-center justify-between cursor-pointer transition-colors ${selectedBrand?.id === brand.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedBrand?.id === brand.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        <Tag size={14} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{brand.name}</p>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{brand.files?.length || 0} Files</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand.id); }}
                                        className="p-1.5 text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <ChevronRight size={16} className="text-slate-300" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* File Management */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                    {selectedBrand ? (
                        <div className="flex flex-col h-full">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">{selectedBrand.name} Documentation</h2>
                                    <p className="text-sm text-slate-500">Upload and manage PDFs for this brand.</p>
                                </div>
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="pdf-upload"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                    />
                                    <label
                                        htmlFor="pdf-upload"
                                        className={`flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold cursor-pointer hover:bg-black transition shadow-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        {uploading ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Upload size={18} />
                                        )}
                                        {uploading ? 'Uploading...' : 'Upload PDF'}
                                    </label>
                                </div>
                            </div>

                            <div className="p-6">
                                {!selectedBrand.files || selectedBrand.files.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                        <FileText size={48} className="mb-4 opacity-20" />
                                        <p className="font-medium italic">No documents uploaded for this brand.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedBrand.files.sort((a, b) => a.display_order - b.display_order).map((file) => (
                                            <div
                                                key={file.id}
                                                className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-4 group"
                                            >
                                                <div className="relative w-20 h-20 bg-white rounded-lg border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-300">
                                                    {file.thumbnail_path ? (
                                                        <img
                                                            src={supabase.storage.from('brand-guidance').getPublicUrl(file.thumbnail_path).data.publicUrl}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <FileText size={20} />
                                                    )}
                                                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[8px] text-white font-black uppercase cursor-pointer">
                                                        <Upload size={12} className="mb-1" />
                                                        {file.thumbnail_path ? 'Change Image' : 'Add Image'}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => handleFileUpload(e, true, file.id)}
                                                        />
                                                    </label>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate" title={file.file_name}>
                                                        {file.file_name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">PDF Document</p>
                                                    <div className="mt-3 flex items-center gap-3">
                                                        <a
                                                            href={supabase.storage.from('brand-guidance').getPublicUrl(file.file_path).data.publicUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-black text-indigo-600 uppercase hover:text-indigo-700 underline"
                                                        >
                                                            View
                                                        </a>
                                                        <button
                                                            onClick={() => handleDeleteFile(file)}
                                                            className="text-[10px] font-black text-red-500 uppercase hover:text-red-700 underline"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12">
                            <Tag size={64} className="mb-6 opacity-10" />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Brand</h3>
                            <p className="text-center max-w-sm">Choose a brand from the list on the left to manage its documents and brand guidance materials.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
