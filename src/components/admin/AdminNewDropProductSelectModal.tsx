import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Search, Plus, Check, Loader2, Package } from 'lucide-react';

interface AdminNewDropProductSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (productIds: string[]) => void;
    existingProductIds: string[];
}

export const AdminNewDropProductSelectModal: React.FC<AdminNewDropProductSelectModalProps> = ({ 
    isOpen, onClose, onConfirm, existingProductIds 
}) => {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSearch = async () => {
        if (!search.trim()) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('id, name, sku, barcode, price, product_images(image_url)')
                .or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
                .limit(20);
            
            if (error) throw error;
            setResults(data || []);
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleProduct = (id: string) => {
        if (existingProductIds.includes(id)) return;
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in text-left">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select Products</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                            {selectedIds.size} Items Selected
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Search Area */}
                <div className="p-8 border-b border-slate-50">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or SKU..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>
                        <button 
                            onClick={handleSearch}
                            className="px-8 py-4 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Find'}
                        </button>
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-8 space-y-4">
                    {results.map(product => {
                        const isSelected = selectedIds.has(product.id);
                        const isAlreadyIn = existingProductIds.includes(product.id);
                        const primaryImage = product.product_images?.[0];
                        const imageUrl = primaryImage ? supabase.storage.from('product-images').getPublicUrl(primaryImage.image_url).data.publicUrl : null;

                        return (
                            <div 
                                key={product.id}
                                onClick={() => !isAlreadyIn && toggleProduct(product.id)}
                                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                                    isAlreadyIn ? 'opacity-40 grayscale cursor-not-allowed bg-slate-50 border-slate-100' :
                                    isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-indigo-200'
                                }`}
                            >
                                <div className="w-12 h-12 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
                                    {imageUrl ? (
                                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                                            <Package size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-900 truncate">{product.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono font-bold">{product.sku}</p>
                                </div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                                    isAlreadyIn ? 'bg-slate-200 border-slate-200 text-white' :
                                    isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-transparent'
                                }`}>
                                    <Check size={16} />
                                </div>
                            </div>
                        );
                    })}

                    {results.length === 0 && !loading && (
                        <div className="text-center py-12">
                            <Package size={48} className="mx-auto text-slate-100 mb-4" />
                            <p className="text-slate-400 font-bold italic text-sm">Search for products to add...</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-50 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(Array.from(selectedIds))}
                        disabled={selectedIds.size === 0}
                        className="flex-[2] py-4 bg-zinc-950 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg disabled:opacity-30"
                    >
                        Confirm Selection ({selectedIds.size})
                    </button>
                </div>
            </div>
        </div>
    );
};
