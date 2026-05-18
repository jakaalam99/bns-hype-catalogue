import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../features/auth/useAuthStore';
import { Loader2, Search, Plus, Trash2, ArrowLeft, Package, Sparkles, MessageSquare, Info, FileDown, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AdminNewDropImportModal } from '../components/admin/AdminNewDropImportModal';
import { AdminNewDropProductSelectModal } from '../components/admin/AdminNewDropProductSelectModal';

// Sub-component for smooth note editing with debounce
const NewDropNoteEditor = ({ initialValue, onSave }: { initialValue: string, onSave: (val: string) => void }) => {
    const [localValue, setLocalValue] = useState(initialValue || '');
    
    // Sync with initialValue if it changes from outside
    useEffect(() => {
        setLocalValue(initialValue || '');
    }, [initialValue]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue !== initialValue) {
                onSave(localValue);
            }
        }, 800); // Save after 800ms of no typing
        return () => clearTimeout(timer);
    }, [localValue]);

    return (
        <textarea
            placeholder="Write notes about this drop (e.g. Launching this Saturday, limited stock available...)"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            className="w-full h-32 bg-transparent outline-none font-bold text-slate-700 placeholder:text-slate-300 resize-none leading-relaxed"
        />
    );
};

export const NewDropDetail = () => {
    const { id } = useParams<{ id: string }>();
    const [batch, setBatch] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
    
    // Local filter for items already in the bucket
    const [filterQuery, setFilterQuery] = useState('');
    const location = useLocation();
    const isInsideAdmin = location.pathname.startsWith('/admin');
    const listPath = isInsideAdmin ? '/admin/new-drops' : '/new-drops';
    
    const { user } = useAuthStore();
    const role = user?.user_metadata?.role?.toUpperCase() || '';
    const canManage = ['ADMIN', 'MD'].includes(role);

    useEffect(() => {
        if (id) {
            fetchBatch();
            fetchItems();
        }
    }, [id]);

    const fetchBatch = async () => {
        const { data } = await supabase.from('new_drops_batches').select('*').eq('id', id).single();
        if (data) setBatch(data);
    };

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('new_drops_items')
                .select(`
                    id,
                    notes,
                    product:products (
                        id, name, sku, barcode, price, 
                        images:product_images (*)
                    )
                `)
                .eq('batch_id', id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error("Error fetching items:", err);
        } finally {
            setLoading(false);
        }
    };

    const addMultipleItemsToBatch = async (productIds: string[]) => {
        if (!id) return;
        try {
            const itemsToInsert = productIds.map(pid => ({
                batch_id: id,
                product_id: pid
            }));

            const { error } = await supabase
                .from('new_drops_items')
                .upsert(itemsToInsert, { onConflict: 'batch_id,product_id' });

            if (error) throw error;
            
            setIsSelectModalOpen(false);
            fetchItems();
        } catch (err) {
            console.error("Error adding items:", err);
            alert("Failed to add products.");
        }
    };

    const filteredItems = useMemo(() => {
        if (!filterQuery.trim()) return items;
        const q = filterQuery.toLowerCase();
        return items.filter(item => 
            item.product?.name?.toLowerCase().includes(q) || 
            item.product?.sku?.toLowerCase().includes(q)
        );
    }, [items, filterQuery]);

    const removeItemFromBatch = async (itemId: string) => {
        if (!confirm("Remove this product from the drop?")) return;
        try {
            const { error } = await supabase.from('new_drops_items').delete().eq('id', itemId);
            if (error) throw error;
            setItems(items.filter(i => i.id !== itemId));
        } catch (err) {
            console.error("Error removing item:", err);
        }
    };

    const updateItemNotes = async (itemId: string, notes: string) => {
        try {
            const { error } = await supabase.from('new_drops_items').update({ notes }).eq('id', itemId);
            if (error) throw error;
            // Notes are updated in Supabase; local items list doesn't strictly need refresh 
            // because the sub-component handles the visual state.
        } catch (err) {
            console.error("Error updating notes:", err);
        }
    };

    if (loading && !batch) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Loading Drop Bucket...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-32 animate-fade-in-up">
            {/* Header */}
            <div className="space-y-6">
                <Link to={listPath} className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                    <ArrowLeft size={16} /> Back to Drops
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div>
                        <h1 className="text-5xl font-black tracking-tight text-slate-900">{batch?.name}</h1>
                        <p className="text-slate-500 mt-2 font-medium">{batch?.description || 'Curated drop selection'}</p>
                    </div>
                    {/* Search and Manage Tools */}
                    <div className="w-full md:w-[32rem] space-y-4">
                        {canManage && (
                            <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 mb-2">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                                        <Plus size={14} /> Management Tools
                                    </p>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                const ws = XLSX.utils.json_to_sheet([{ sku: 'SKU-EXAMPLE-123', notes: 'Coming this Friday!' }]);
                                                const wb = XLSX.utils.book_new();
                                                XLSX.utils.book_append_sheet(wb, ws, "Template");
                                                XLSX.writeFile(wb, "new_drop_template.xlsx");
                                            }}
                                            className="text-[10px] font-black text-indigo-400 hover:text-indigo-600 uppercase flex items-center gap-1"
                                        >
                                            <FileDown size={12} /> Template
                                        </button>
                                        <button 
                                            onClick={() => setIsImportModalOpen(true)}
                                            className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm border border-indigo-100"
                                        >
                                            <Upload size={12} /> Bulk Import
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 font-medium italic">Manage this week's selection or import a bulk list via Excel.</p>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search in this bucket..."
                                    value={filterQuery}
                                    onChange={(e) => setFilterQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[2rem] text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                />
                                {filterQuery && (
                                    <button onClick={() => setFilterQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            {canManage && (
                                <button 
                                    onClick={() => setIsSelectModalOpen(true)}
                                    className="px-6 py-4 bg-zinc-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg"
                                >
                                    <Plus size={16} /> Add Product
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 gap-8">
                {filteredItems.map(item => {
                    const product = item.product;
                    const primaryImage = product?.images?.find((img: any) => img.display_order === 0) || product?.images?.[0];
                    const imageUrl = primaryImage ? supabase.storage.from('product-images').getPublicUrl(primaryImage.image_url).data.publicUrl : null;
                    
                    return (
                        <div key={item.id} className="group bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden animate-fade-in">
                            <div className="flex flex-col lg:flex-row">
                                {/* Image Section */}
                                <Link to={`/product/${product?.id}`} className="w-full lg:w-1/3 aspect-square bg-slate-50 relative overflow-hidden shrink-0">
                                    {imageUrl ? (
                                        <img src={imageUrl} alt={product?.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                                            <Package size={64} />
                                        </div>
                                    )}
                                    {batch?.is_badge_active && (
                                        <div className="absolute top-6 left-6 bg-amber-500 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2 animate-pulse">
                                            <Sparkles size={14} /> New Drop
                                        </div>
                                    )}
                                </Link>

                                {/* Info Section */}
                                <div className="p-10 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className="text-3xl font-black text-slate-900 mb-2">{product?.name}</h2>
                                            <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5 text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                                                    <Package size={14} /> {product?.sku}
                                                </span>
                                                <span className="flex items-center gap-1.5 text-indigo-700 font-black bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
                                                    <Info size={14} /> Rp {product?.price?.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        {canManage && (
                                            <button
                                                onClick={() => removeItemFromBatch(item.id)}
                                                className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Notes Section */}
                                    <div className="flex-1 bg-slate-50/50 rounded-3xl p-8 relative mt-4 border border-slate-50">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                                            <MessageSquare size={14} className="text-indigo-500" /> Drop Notes & Launch Details
                                        </div>
                                        {canManage ? (
                                            <NewDropNoteEditor 
                                                initialValue={item.notes} 
                                                onSave={(val) => updateItemNotes(item.id, val)} 
                                            />
                                        ) : (
                                            <p className="text-slate-700 font-bold whitespace-pre-wrap leading-relaxed italic">
                                                {item.notes || "No specific launch notes for this product."}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-8 flex justify-end">
                                        <Link 
                                            to={`/product/${product?.id}`}
                                            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all"
                                        >
                                            View Product Details
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredItems.length === 0 && (
                <div className="text-center py-24">
                    <Sparkles size={64} className="mx-auto text-slate-100 mb-6" />
                    <p className="text-slate-400 font-bold italic">No products found matching your search.</p>
                </div>
            )}

            {isSelectModalOpen && (
                <AdminNewDropProductSelectModal
                    isOpen={isSelectModalOpen}
                    onClose={() => setIsSelectModalOpen(false)}
                    onConfirm={addMultipleItemsToBatch}
                    existingProductIds={items.map(i => i.product?.id)}
                />
            )}

            {isImportModalOpen && (
                <AdminNewDropImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    batchId={id!}
                    onSuccess={fetchItems}
                />
            )}
        </div>
    );
};
