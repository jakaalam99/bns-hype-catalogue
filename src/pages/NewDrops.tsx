import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../features/auth/useAuthStore';
import { Plus, Sparkles, Calendar, ChevronRight, Loader2, Trash2, Search, X, Edit2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const NewDrops = () => {
    const [batches, setBatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState<any>(null);
    const [newBatchName, setNewBatchName] = useState('');
    const [newBatchDesc, setNewBatchDesc] = useState('');
    const [isBadgeActive, setIsBadgeActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const location = useLocation();
    const isInsideAdmin = location.pathname.startsWith('/admin');
    const basePath = isInsideAdmin ? '/admin/new-drops' : '/new-drops';

    const { user } = useAuthStore();
    const role = user?.user_metadata?.role?.toUpperCase() || '';
    const canManage = ['ADMIN', 'MD'].includes(role);

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        setLoading(true);
        try {
            // Fetch batches along with their items and product details for global search
            const { data, error } = await supabase
                .from('new_drops_batches')
                .select(`
                    *,
                    items:new_drops_items(
                        product:products(name, sku)
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setBatches(data || []);
        } catch (err) {
            console.error("Error fetching batches:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredBatches = useMemo(() => {
        if (!searchQuery.trim()) return batches;
        const q = searchQuery.toLowerCase();
        
        return batches.filter(batch => {
            // Match batch metadata
            const matchesBatch = batch.name?.toLowerCase().includes(q) || 
                                batch.description?.toLowerCase().includes(q);
            
            // Match products inside the batch
            const matchesProduct = batch.items?.some((item: any) => 
                item.product?.name?.toLowerCase().includes(q) || 
                item.product?.sku?.toLowerCase().includes(q)
            );

            return matchesBatch || matchesProduct;
        });
    }, [batches, searchQuery]);

    const handleCreateBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBatchName.trim()) return;

        setSaving(true);
        try {
            const { error } = await supabase.from('new_drops_batches').insert({
                name: newBatchName,
                description: newBatchDesc,
                is_active: true,
                is_badge_active: isBadgeActive
            });
            if (error) throw error;
            
            alert("New drop bucket created!");
            setNewBatchName('');
            setNewBatchDesc('');
            setIsBadgeActive(false);
            setIsCreateModalOpen(false);
            fetchBatches();
        } catch (err) {
            console.error("Error creating batch:", err);
            alert("Failed to create drop bucket.");
        } finally {
            setSaving(false);
        }
    };

    const [saving, setSaving] = useState(false);

    const handleUpdateBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBatch || !newBatchName.trim()) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('new_drops_batches')
                .update({
                    name: newBatchName,
                    description: newBatchDesc,
                    is_badge_active: isBadgeActive
                })
                .eq('id', editingBatch.id);
            
            if (error) throw error;
            
            alert("Changes saved successfully!");
            setNewBatchName('');
            setNewBatchDesc('');
            setIsBadgeActive(false);
            setEditingBatch(null);
            setIsEditModalOpen(false);
            fetchBatches();
        } catch (err) {
            console.error("Error updating batch:", err);
            alert("Failed to save changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBatch = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this drop batch? All product links inside will be removed.")) return;
        
        try {
            const { error } = await supabase
                .from('new_drops_batches')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            fetchBatches();
        } catch (err) {
            console.error("Error deleting batch:", err);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Syncing New Drops...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-fade-in-up pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-5xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        New Drops <Sparkles className="text-indigo-500" size={40} />
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium italic">"Weekly curated buckets of upcoming heat."</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => {
                            setNewBatchName('');
                            setNewBatchDesc('');
                            setIsBadgeActive(false);
                            setIsCreateModalOpen(true);
                        }}
                        className="px-6 py-4 bg-zinc-950 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-premium flex items-center gap-2"
                    >
                        <Plus size={20} /> Create New Bucket
                    </button>
                )}
            </div>

            {/* Global Search Bar */}
            <div className="max-w-2xl">
                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search SKU or Name across all buckets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-16 pr-12 py-5 bg-white border border-slate-200 rounded-[2rem] text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all placeholder:text-slate-300"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <p className="mt-3 text-xs font-bold text-indigo-600 px-6">
                        Searching products and buckets for "{searchQuery}"...
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredBatches.map(batch => (
                    <div key={batch.id} className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col relative">
                        <Link to={`${basePath}/${batch.id}`} className="p-8 flex-1">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                                    <Calendar size={24} />
                                </div>
                                {batch.is_badge_active && (
                                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                                        <Sparkles size={10} /> Active Badge
                                    </span>
                                )}
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{batch.name}</h3>
                            <p className="text-slate-500 text-sm font-medium line-clamp-2 mb-6">
                                {batch.description || 'No description provided.'}
                            </p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600">
                                    {canManage ? 'Manage Bucket' : 'View Products'} <ChevronRight size={14} />
                                </div>
                                <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-tight">
                                    {batch.items?.length || 0} Products
                                </div>
                            </div>
                        </Link>
                        
                        {canManage && (
                            <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => {
                                        setEditingBatch(batch);
                                        setNewBatchName(batch.name);
                                        setNewBatchDesc(batch.description || '');
                                        setIsBadgeActive(batch.is_badge_active || false);
                                        setIsEditModalOpen(true);
                                    }}
                                    className="p-3 bg-white/80 backdrop-blur text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm border border-slate-100 transition-all"
                                    title="Edit Bucket Info"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDeleteBatch(batch.id)}
                                    className="p-3 bg-white/80 backdrop-blur text-slate-300 hover:text-red-500 rounded-xl shadow-sm border border-slate-100 transition-all"
                                    title="Delete Bucket"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        )}
                        
                        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {new Date(batch.created_at).toLocaleDateString()}
                            </span>
                            {canManage && (
                                <Link 
                                    to={`${basePath}/${batch.id}`}
                                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                >
                                    Quick Edit <ChevronRight size={12} />
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredBatches.length === 0 && (
                <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 animate-fade-in">
                    <Calendar size={64} className="mx-auto text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 mb-2">No Results Found</h3>
                    <p className="text-slate-500 font-medium italic">Try searching for a different SKU or name.</p>
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="mt-6 text-indigo-600 font-black uppercase tracking-widest text-xs hover:underline"
                        >
                            Clear Search
                        </button>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-premium border border-slate-100 relative overflow-hidden animate-slide-up">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                        <h2 className="text-3xl font-black text-slate-900 mb-8">New Bucket</h2>
                        <form onSubmit={handleCreateBatch} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Bucket Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Week 1 May 2026"
                                    value={newBatchName}
                                    onChange={(e) => setNewBatchName(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Description</label>
                                <textarea
                                    placeholder="Brief notes about this drop..."
                                    value={newBatchDesc}
                                    onChange={(e) => setNewBatchDesc(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold h-24 resize-none"
                                />
                            </div>
                            <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-black text-amber-900 uppercase flex items-center gap-2">
                                            <Sparkles size={16} /> Activate Badge
                                        </p>
                                        <p className="text-[10px] font-bold text-amber-600/70 mt-1 uppercase tracking-tight">Show "NEW DROP" on all products</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsBadgeActive(!isBadgeActive)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${isBadgeActive ? 'bg-amber-500' : 'bg-amber-200'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isBadgeActive ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-[2] py-4 bg-zinc-950 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {saving && <Loader2 className="animate-spin" size={18} />}
                                    {saving ? 'Creating...' : 'Create Drop'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-premium border border-slate-100 relative overflow-hidden animate-slide-up">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                        <h2 className="text-3xl font-black text-slate-900 mb-8">Edit Bucket</h2>
                        <form onSubmit={handleUpdateBatch} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Bucket Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Week 1 May 2026"
                                    value={newBatchName}
                                    onChange={(e) => setNewBatchName(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Description</label>
                                <textarea
                                    placeholder="Brief notes about this drop..."
                                    value={newBatchDesc}
                                    onChange={(e) => setNewBatchDesc(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold h-24 resize-none"
                                />
                            </div>
                            <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-black text-amber-900 uppercase flex items-center gap-2">
                                            <Sparkles size={16} /> Activate Badge
                                        </p>
                                        <p className="text-[10px] font-bold text-amber-600/70 mt-1 uppercase tracking-tight">Show "NEW DROP" on all products</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsBadgeActive(!isBadgeActive)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${isBadgeActive ? 'bg-amber-500' : 'bg-amber-200'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isBadgeActive ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        setEditingBatch(null);
                                    }}
                                    className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-[2] py-4 bg-zinc-950 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {saving && <Loader2 className="animate-spin" size={18} />}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
