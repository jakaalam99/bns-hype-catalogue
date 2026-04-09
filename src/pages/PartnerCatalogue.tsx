import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ProductWithImages } from '../types/product';
import { Search, SlidersHorizontal, Loader2, Trash2, Plus, Minus, Package, ListFilter, Download, Upload, ArrowRight } from 'lucide-react';
import { formatIDR } from '../lib/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { useBasket } from '../features/catalogue/BasketContext';
import { PartnerImportModal } from '../components/partner/PartnerImportModal';
import * as XLSX from 'xlsx';

export const PartnerCatalogue = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { items, addToBasket, removeFromBasket, updateQuantity, clearBasket, totalCount } = useBasket();

    const [products, setProducts] = useState<ProductWithImages[]>([]);
    const [loading, setLoading] = useState(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [showDraft, setShowDraft] = useState(true);

    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());

    // Filters from URL
    const searchQuery = searchParams.get('q') || '';
    const categoryFilter = searchParams.get('category') || '';
    const sortOption = (searchParams.get('sort') as any) || 'newest';

    const setCategoryFilter = (val: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (val) newParams.set('category', val);
        else newParams.delete('category');
        newParams.set('page', '1');
        setSearchParams(newParams, { replace: true });
    };

    const setSortOption = (val: string) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('sort', val);
        newParams.set('page', '1');
        setSearchParams(newParams, { replace: true });
    };

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const setPage = (p: number) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', p.toString());
        setSearchParams(newParams, { replace: true });
    };

    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const ITEMS_PER_PAGE = 24;

    const [categories, setCategories] = useState<string[]>([]);
    const [hideOutOfStock, setHideOutOfStock] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await supabase.from('store_settings').select('hide_out_of_stock').eq('id', 1).single();
                if (data) setHideOutOfStock(data.hide_out_of_stock);
            } catch (err) {
                console.error("Failed to load store settings", err);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const { data, error } = await supabase.rpc('get_filtered_categories', {
                    search_text: searchQuery,
                    brand_text: '', // No brand filter on partner yet
                    hide_out_of_stock_param: hideOutOfStock
                });

                if (error) throw error;
                if (data) {
                    setCategories(data.map((row: any) => row.category));
                }
            } catch (err) {
                console.error("Failed to load filters", err);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchFilterOptions();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, categoryFilter, hideOutOfStock]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchProducts(page);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, sortOption, categoryFilter, page, hideOutOfStock]);

    const fetchProducts = async (pageNumber: number) => {
        if (pageNumber === 1) setLoading(true);
        else setLoadingMore(true);
        try {
            let query = supabase
                .from('admin_products_view')
                .select(`
                    *,
                    images:product_images(*)
                `)
                .eq('is_active', true);

            if (hideOutOfStock) {
                query = query.gt('total_stock', 0);
            }

            if (searchQuery.trim() !== '') {
                query = query.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
            }

            if (categoryFilter) {
                query = query.eq('category', categoryFilter);
            }

            switch (sortOption) {
                case 'newest':
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'price_asc':
                    query = query.order('price', { ascending: true });
                    break;
                case 'price_desc':
                    query = query.order('price', { ascending: false });
                    break;
            }

            const from = (pageNumber - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, error } = await query.range(from, to);

            if (error) throw error;

            if (pageNumber === 1) {
                setProducts(data as any);
            } else {
                setProducts(prev => [...prev, ...(data as any)]);
            }

            setHasMore(data.length === ITEMS_PER_PAGE);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            if (pageNumber === 1) setLoading(false);
            else setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        setPage(page + 1);
    };

    const handleQuantityChange = (productId: string, delta: number) => {
        setQuantities(prev => {
            const current = prev[productId] || 1;
            const next = Math.max(1, current + delta);
            return { ...prev, [productId]: next };
        });
    };

    const onAddToBasket = (e: React.MouseEvent, product: ProductWithImages) => {
        e.preventDefault();
        e.stopPropagation();
        const qty = quantities[product.id] || 1;
        addToBasket(product, qty);

        setAddedProducts(prev => {
            const next = new Set(prev);
            next.add(product.id);
            return next;
        });
        setTimeout(() => {
            setAddedProducts(prev => {
                const next = new Set(prev);
                next.delete(product.id);
                return next;
            });
        }, 2000);

        setQuantities(prev => ({ ...prev, [product.id]: 1 }));
    };

    const exportToExcel = () => {
        if (items.length === 0) return;

        const date = new Date().toISOString().split('T')[0];
        const fileName = `Partner_Draft_${date}.xlsx`;

        const data = items.map(item => ({
            'Barcode': item.barcode,
            'SKU': item.sku,
            'Product Name': item.name,
            'Category': item.category,
            'Quantity': item.quantity
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Draft Order');

        const wscols = [
            { wch: 15 }, // Barcode
            { wch: 15 }, // SKU
            { wch: 35 }, // Product Name
            { wch: 15 }, // Category
            { wch: 10 }  // Quantity
        ];
        ws['!cols'] = wscols;

        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="space-y-8 animate-fade-in relative pb-32">
            {/* Partner Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                         <span className="px-2 py-0.5 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded">Private</span>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Partner Portal</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-display font-black text-slate-900 tracking-tighter uppercase leading-none">
                        Drafting <span className="text-slate-400">Workspace</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">Review, import, and export your product selections.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-900 font-bold rounded-2xl hover:bg-slate-50 active:scale-95 transition-all text-xs uppercase tracking-widest shadow-sm"
                    >
                        <Upload size={16} />
                        Bulk Import
                    </button>
                    <button 
                        onClick={exportToExcel}
                        disabled={items.length === 0}
                        className="flex items-center gap-2 px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-zinc-800 active:scale-95 transition-all text-xs uppercase tracking-widest shadow-premium disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Download size={16} />
                        Export Sheet
                    </button>
                </div>
            </div>

            {/* Current Draft Section */}
            <div className={`bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden transition-all duration-500 ${showDraft ? 'max-h-[1000px] mb-12' : 'max-h-16 mb-6 opacity-60'}`}>
                <div 
                    className="p-6 flex items-center justify-between border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setShowDraft(!showDraft)}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <ListFilter size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active List</span>
                            <span className="font-bold text-slate-900">{totalCount} items in draft</span>
                        </div>
                    </div>
                    <button className="text-slate-400 hover:text-slate-900 transition-colors capitalize text-xs font-bold">
                        {showDraft ? 'Collapse' : 'Expand'}
                    </button>
                </div>

                {showDraft && (
                    <div className="p-6">
                        {items.length === 0 ? (
                            <div className="py-12 text-center">
                                <Package size={40} className="mx-auto text-slate-200 mb-3" />
                                <p className="text-slate-400 font-medium italic text-sm">Your draft list is currently empty. Start adding from the catalogue below.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                    {items.map(item => (
                                        <div key={item.sku} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-300 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 border border-slate-100 overflow-hidden">
                                                    {item.image_url ? (
                                                        <img 
                                                           src={supabase.storage.from('product-images').getPublicUrl(item.image_url).data.publicUrl} 
                                                           alt={item.name} 
                                                           className="w-full h-full object-contain"
                                                        />
                                                    ) : <Package className="text-slate-300" size={16} />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate max-w-[200px]">{item.name}</span>
                                                    <span className="text-[9px] font-mono text-slate-400 uppercase">{item.sku}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden h-8">
                                                    <button 
                                                       onClick={() => updateQuantity(item.sku, item.quantity - 1)}
                                                       className="px-2 hover:bg-slate-50 text-slate-400 transition-colors"
                                                    >
                                                        <Minus size={10} />
                                                    </button>
                                                    <div className="w-8 text-center text-xs font-bold tabular-nums">{item.quantity}</div>
                                                    <button 
                                                       onClick={() => updateQuantity(item.sku, item.quantity + 1)}
                                                       className="px-2 hover:bg-slate-50 text-slate-400 transition-colors"
                                                    >
                                                        <Plus size={10} />
                                                    </button>
                                                </div>
                                                <button 
                                                   onClick={() => removeFromBasket(item.sku)}
                                                   className="text-red-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button 
                                       onClick={clearBasket}
                                       className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500 hover:text-red-600 py-2 border-b border-transparent hover:border-red-600 transition-all"
                                    >
                                        Clear Entire Draft
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Minimalist Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-950 p-6 rounded-2xl border border-white/10 shadow-premium relative z-10">
                <div className="relative w-full md:max-w-md">
                     <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-zinc-500" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search Catalogue..."
                        value={searchQuery}
                        onChange={(e) => {
                            const params = new URLSearchParams(searchParams);
                            if (e.target.value) params.set('q', e.target.value);
                            else params.delete('q');
                            params.set('page', '1');
                            setSearchParams(params, { replace: true });
                        }}
                        className="block w-full pl-11 pr-4 py-3 bg-zinc-900 border border-white/5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all shadow-sm"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-auto">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full md:w-auto appearance-none bg-zinc-900 border border-white/5 text-zinc-300 py-3 pl-4 pr-10 rounded-xl focus:outline-none font-medium text-sm cursor-pointer shadow-sm hover:bg-zinc-800 transition-colors"
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>

                    <div className="relative w-full md:w-auto flex items-center">
                        <div className="absolute left-3 pointer-events-none text-zinc-500">
                             <SlidersHorizontal size={16} />
                        </div>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as any)}
                            className="w-full md:w-auto appearance-none bg-zinc-900 border border-white/5 text-zinc-300 py-3 pl-10 pr-10 rounded-xl focus:outline-none font-medium text-sm cursor-pointer shadow-sm hover:bg-zinc-800 transition-colors"
                        >
                            <option value="newest">Newest First</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                    <p className="text-slate-500 font-medium">Synchronizing Catalogue...</p>
                </div>
            ) : products.length === 0 ? (
                <div className="py-24 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No matching products</h3>
                    <p className="text-slate-500 max-w-md mx-auto">Try a different search term or category.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map((product, index) => {
                        const primaryImage = product.images?.find((img: any) => img.display_order === 0) || product.images?.[0];

                        return (
                            <div key={product.id} className="group bg-white rounded-3xl p-3 border border-slate-100 hover:border-slate-300 hover:shadow-xl transition-all duration-500 flex flex-col" style={{ animationDelay: `${index * 30}ms` }}>
                                <Link to={`/product/${product.id}`} className="block relative aspect-square rounded-2xl overflow-hidden mb-4 bg-slate-50">
                                    {primaryImage ? (
                                        <img
                                            src={supabase.storage.from('product-images').getPublicUrl(primaryImage.image_url).data.publicUrl}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-[10px] tracking-widest uppercase">BNS Hype</div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </Link>

                                <div className="px-1 flex-1 flex flex-col">
                                    <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">
                                        <span>{product.sku || 'N/A'}</span>
                                        <span>•</span>
                                        <span className={product.total_stock && product.total_stock <= 0 ? 'text-red-500' : 'text-indigo-600'}>
                                            Stock: {product.total_stock || 0}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                                        {product.name}
                                    </h3>
                                    
                                    <div className="mt-auto">
                                        <div className="flex items-baseline gap-2 mb-3">
                                            {product.discount_price ? (
                                                <>
                                                    <span className="font-black text-slate-900 text-sm">{formatIDR(product.discount_price)}</span>
                                                    <span className="text-[10px] text-red-400 line-through font-bold">{formatIDR(product.price)}</span>
                                                </>
                                            ) : (
                                                <span className="font-black text-slate-900 text-sm">{formatIDR(product.price)}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden h-9">
                                                <button
                                                    onClick={() => handleQuantityChange(product.id, -1)}
                                                    className="px-2 hover:bg-white text-slate-400 transition-colors"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <div className="w-8 text-center text-xs font-bold tabular-nums">
                                                    {quantities[product.id] || 1}
                                                </div>
                                                <button
                                                    onClick={() => handleQuantityChange(product.id, 1)}
                                                    className="px-2 hover:bg-white text-slate-400 transition-colors"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={(e) => onAddToBasket(e, product)}
                                                className={`flex-1 rounded-xl h-9 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${addedProducts.has(product.id)
                                                    ? 'bg-emerald-500 text-white shadow-emerald-200'
                                                    : 'bg-zinc-950 text-white hover:bg-zinc-800 shadow-lg shadow-black/10'
                                                    }`}
                                            >
                                                {addedProducts.has(product.id) ? 'Added' : 'Draft'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {!loading && products.length > 0 && hasMore && (
                <div className="py-12 text-center">
                    <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="px-12 py-4 bg-white border border-slate-200 text-slate-900 font-bold text-sm tracking-widest uppercase rounded-2xl hover:bg-slate-50 transition-all shadow-sm flex items-center gap-3 mx-auto"
                    >
                        {loadingMore ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                        {loadingMore ? 'Loading More...' : 'View Next Page'}
                    </button>
                </div>
            )}

            <PartnerImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
        </div>
    );
};
