import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { Loader2, Search, ShoppingCart, Filter, Tag, Package, Check, Sparkles, LayoutGrid, List, CheckSquare, Square, ChevronDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBasket } from '../../features/catalogue/BasketContext';
import { Link, useSearchParams } from 'react-router-dom';
import { Skeleton } from '../../components/common/Skeleton';

export const StoreCatalogue = () => {
    const { user } = useAuthStore();
    const { addToBasket, items } = useBasket();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState<string | null>(null);
    const [storeQuotas, setStoreQuotas] = useState<Record<string, number>>({}); 
    const [allShipmentSkus, setAllShipmentSkus] = useState<Set<string>>(new Set());
    const [activeBadges, setActiveBadges] = useState<Set<string>>(new Set());
    const [allBrands, setAllBrands] = useState<string[]>([]);
    const brandFilter = searchParams.get('brand') || '';

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        const { data } = await supabase.from('products').select('brand').not('brand', 'is', null);
        if (data) {
            const uniqueBrands = Array.from(new Set(data.map(p => p.brand))).sort();
            setAllBrands(uniqueBrands as string[]);
        }
    };

    const setBrandFilter = (brand: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (brand) newParams.set('brand', brand);
        else newParams.delete('brand');
        newParams.set('p', '1');
        setSearchParams(newParams);
    };

    const [batches, setBatches] = useState<any[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('catalogue_view_mode') as 'grid' | 'list') || 'grid';
    });

    // Sync search and selected batches from URL
    const search = searchParams.get('q') || '';
    const [localSearch, setLocalSearch] = useState(search);

    const selectedBatches = useMemo(() => searchParams.get('b')?.split(',').filter(Boolean) || [], [searchParams]);
    const currentPage = parseInt(searchParams.get('p') || '1');

    const [hasMore, setHasMore] = useState(true);
    const ITEMS_PER_PAGE = 24;

    // Debounce search update to URL
    useEffect(() => {
        const timer = setTimeout(() => {
            const newParams = new URLSearchParams(searchParams);
            if (localSearch.trim()) {
                if (newParams.get('q') !== localSearch) {
                    newParams.set('q', localSearch);
                    newParams.set('p', '1');
                    setSearchParams(newParams);
                }
            } else {
                if (newParams.has('q')) {
                    newParams.delete('q');
                    newParams.set('p', '1');
                    setSearchParams(newParams);
                }
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [localSearch]);

    useEffect(() => {
        if (user) {
            fetchBatches();
            fetchStoreAndProducts(currentPage);
        }
    }, [user, search, selectedBatches, currentPage, brandFilter]);

    useEffect(() => {
        localStorage.setItem('catalogue_view_mode', viewMode);
    }, [viewMode]);

    // Handle Scroll Saving
    useEffect(() => {
        const handleScroll = () => {
            const scrollPos = window.scrollY;
            if (scrollPos > 0) {
                sessionStorage.setItem('catalogue_scroll_pos', scrollPos.toString());
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const fetchBatches = async () => {
        const { data } = await supabase.from('new_drops_batches').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (data) setBatches(data);
    };

    const updateSearch = (val: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (val) newParams.set('q', val);
        else newParams.delete('q');
        setSearchParams(newParams);
    };

    const toggleBatch = (batchId: string) => {
        const newParams = new URLSearchParams(searchParams);
        let current = selectedBatches;
        if (current.includes(batchId)) {
            current = current.filter(id => id !== batchId);
        } else {
            current = [...current, batchId];
        }
        
        if (current.length > 0) newParams.set('b', current.join(','));
        else newParams.delete('b');
        newParams.set('p', '1'); // Reset to page 1 on filter change
        setSearchParams(newParams);
    };

    const clearAllFilters = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('q');
        newParams.delete('b');
        newParams.delete('brand');
        newParams.set('p', '1');
        setLocalSearch('');
        setSearchParams(newParams);
    };

    const handlePageChange = (newPage: number) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('p', newPage.toString());
        setSearchParams(newParams);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const fetchStoreAndProducts = async (pageNumber: number) => {
        setLoading(true);
        
        try {
            // 1. Get the store linked to this user from their profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('store_id')
                .eq('id', user?.id)
                .single();
            
            if (!profileData || !profileData.store_id) {
                console.error("No store linked to this user profile");
                setLoading(false);
                return;
            }
            setStoreId(profileData.store_id);

            // 2. Fetch products from the store catalogue view with server-side pagination
            let query = supabase
                .from('store_catalogue_view')
                .select('*', { count: 'exact' })
                .eq('viewer_store_id', profileData.store_id);
            
            if (search.trim()) {
                const searchTerm = search.trim();
                query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
            }

            if (brandFilter) {
                query = query.eq('brand', brandFilter);
            }

            if (selectedBatches.length > 0) {
                // We need to filter products that belong to these batches
                const { data: batchItems } = await supabase
                    .from('new_drops_items')
                    .select('product_id')
                    .in('batch_id', selectedBatches);
                
                const productIds = batchItems?.map(i => i.product_id) || [];
                if (productIds.length > 0) {
                    query = query.in('id', productIds);
                } else {
                    // No products in these batches, force empty result
                    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                }
            }

            const from = (pageNumber - 1) * ITEMS_PER_PAGE;
            const to = pageNumber * ITEMS_PER_PAGE - 1;

            const { data, error, count } = await query
                .order('name', { ascending: true })
                .range(from, to);
            
            if (error) throw error;
            
            setProducts(data || []);
            setTotalCount(count || 0);

            // Restore scroll position ONLY if we just came back
            const savedPos = sessionStorage.getItem('catalogue_scroll_pos');
            if (savedPos) {
                setTimeout(() => {
                    window.scrollTo({ top: parseInt(savedPos), behavior: 'instant' as any });
                    sessionStorage.removeItem('catalogue_scroll_pos');
                }, 100);
            }

            // 3. Fetch Quotas for the current store
            // We need the store name to match allocations
            const { data: storeInfo } = await supabase
                .from('destination_locations')
                .select('name')
                .eq('id', profileData.store_id)
                .single();
            
            if (storeInfo) {
                const skus = (data || []).map(p => p.sku).filter(Boolean);
                let fallbackNeeded = true;

                if (skus.length > 0) {
                    try {
                        const { data: quotasData, error: rpcError } = await supabase
                            .rpc('get_store_remaining_quotas', {
                                p_store_id: profileData.store_id,
                                p_skus: skus
                            });
                        
                        if (!rpcError && quotasData) {
                            const qMap: Record<string, number> = {};
                            quotasData.forEach((q: any) => {
                                qMap[q.sku] = q.remaining_quota;
                            });
                            setStoreQuotas(prev => ({ ...prev, ...qMap }));
                            fallbackNeeded = false;
                        } else {
                            console.warn("get_store_remaining_quotas RPC failed, using fallback:", rpcError);
                        }
                    } catch (err) {
                        console.error("Quota fetch exception, using fallback:", err);
                    }
                }

                if (fallbackNeeded) {
                    // Fetch Total Allocations for this store
                    const { data: allAllocations } = await supabase
                        .from('shipment_store_allocations')
                        .select('shipment_item:shipment_items(sku), quantity')
                        .eq('store_name', storeInfo.name);
                    
                    // Fetch Total Confirmed Orders for this store
                    const { data: allOrders } = await supabase
                        .from('store_order_items')
                        .select('product:products(sku), quantity, order:store_orders(status)')
                        .eq('order.store_id', profileData.store_id);
                    
                    const qMap: Record<string, number> = {};
                    
                    // Add allocations
                    allAllocations?.forEach((a: any) => {
                        const sku = a.shipment_item?.sku;
                        if (sku) qMap[sku] = (qMap[sku] || 0) + a.quantity;
                    });
                    
                    // Subtract orders
                    allOrders?.forEach((o: any) => {
                        if (o.order?.status === 'Rejected') return;
                        const sku = o.product?.sku;
                        if (sku) qMap[sku] = (qMap[sku] || 0) - o.quantity;
                    });
                    
                    setStoreQuotas(qMap);
                }
            }

            // 4. Fetch all SKUs that exist in ANY shipment to know where to apply quota rules
            const { data: shipSkus } = await supabase
                .from('shipment_items')
                .select('sku');
            
            if (shipSkus) {
                setAllShipmentSkus(new Set(shipSkus.map(s => s.sku)));
            }

            // 5. Fetch ALL Active Badges (more robust than per-page)
            try {
                const { data: activeBadgeData, error: badgeError } = await supabase
                    .from('new_drops_items')
                    .select('product_id, batch:new_drops_batches!inner(is_badge_active)')
                    .eq('batch.is_badge_active', true);
                
                if (!badgeError && activeBadgeData) {
                    setActiveBadges(new Set(activeBadgeData.map(b => b.product_id)));
                } else if (badgeError) {
                    console.error("Badge query error:", badgeError);
                }
            } catch (err) {
                console.error("Badge fetch error:", err);
            }

        } catch (err) {
            console.error("Catalogue Error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !products.length && !search) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 mt-16">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm p-4">
                        <Skeleton className="w-full aspect-[4/3] rounded-xl mb-4" />
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center">
                                <Skeleton className="h-5 w-1/3" />
                                <Skeleton className="h-8 w-24 rounded-lg" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!storeId && !loading) {
        return (
            <div className="max-w-2xl mx-auto mt-20 p-12 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-center">
                <Package size={48} className="mx-auto text-slate-200 mb-6" />
                <h2 className="text-2xl font-black text-slate-900 mb-2">Account Not Configured</h2>
                <p className="text-slate-500">Your account is not linked to a physical store location. Please contact an MD to set up your store access.</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-5xl font-black tracking-tight text-slate-900">Store Catalogue</h1>
                    <p className="text-slate-500 mt-2 font-medium">Order stock for your store from authorized warehouses.</p>
                </div>
                
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={20} />
                        </button>
                    </div>

                    <div className="relative group">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all border ${
                                selectedBatches.length > 0 
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-200 shadow-lg' 
                                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-500'
                            }`}
                        >
                            <Filter size={18} />
                            {selectedBatches.length > 0 ? `Drops (${selectedBatches.length})` : 'Filter Drops'}
                            <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>

                        {showFilters && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-3xl border border-slate-100 shadow-2xl p-4 z-50 animate-fade-in">
                                <div className="flex justify-between items-center mb-4 px-2">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Available Drops</span>
                                    {selectedBatches.length > 0 && (
                                        <button onClick={clearAllFilters} className="text-[10px] text-indigo-600 font-bold hover:underline">Clear All</button>
                                    )}
                                </div>
                                <div className="space-y-1 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                    {batches.map(batch => (
                                        <button
                                            key={batch.id}
                                            onClick={() => toggleBatch(batch.id)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                                                selectedBatches.includes(batch.id) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'
                                            }`}
                                        >
                                            <span className="text-sm font-bold">{batch.name}</span>
                                            {selectedBatches.includes(batch.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                    ))}
                                    {batches.length === 0 && <p className="text-xs text-slate-400 text-center py-4 italic">No active drops found.</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search SKU or Name..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="w-full pl-12 pr-10 py-4 bg-white border border-slate-200 rounded-[2rem] text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-premium transition-all"
                        />
                        {localSearch && (
                            <button 
                                onClick={() => setLocalSearch('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-400 ml-2" />
                        <select 
                            value={brandFilter}
                            onChange={(e) => setBrandFilter(e.target.value)}
                            className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/10 outline-none cursor-pointer hover:border-indigo-300 transition-all shadow-sm"
                        >
                            <option value="">All Brands</option>
                            {allBrands.map(brand => (
                                <option key={brand} value={brand}>{brand}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {products.map(product => {
                        const inBasket = (items || []).some(item => item.id === product.id);
                        const imageUrl = product.primary_image_url 
                            ? supabase.storage.from('product-images').getPublicUrl(product.primary_image_url).data.publicUrl
                            : null;
                        
                        return (
                            <div key={product.id} className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden flex flex-col">
                                <Link to={`/product/${product.id}`} className="block aspect-square bg-slate-50 relative overflow-hidden group/img">
                                    {imageUrl ? (
                                        <img 
                                            src={imageUrl} 
                                            alt={product.name} 
                                            loading="lazy"
                                            className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                                            <Package size={48} />
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                                        <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm border border-slate-100">
                                            Stock: {product.stock_qty}
                                        </div>
                                        {allShipmentSkus.has(product.sku) && (
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border flex items-center gap-1 ${
                                                (storeQuotas[product.sku] || 0) > 0 
                                                ? 'bg-indigo-600 text-white border-indigo-500' 
                                                : 'bg-red-500 text-white border-red-400'
                                            }`}>
                                                <Sparkles size={10} /> Quota: {storeQuotas[product.sku] || 0}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                                
                                <div className="p-6 flex-1 flex flex-col">
                                    <Link to={`/product/${product.id}`} className="block group">
                                        <div className="mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-tighter text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                {product.brand || 'General'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors truncate">
                                                {product.name}
                                            </h3>
                                            {activeBadges.has(product.id) && (
                                                <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[7px] font-black uppercase tracking-tighter flex items-center gap-1 shrink-0 animate-pulse">
                                                    <Sparkles size={8} /> New Drop
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono mb-4">{product.sku}</p>
                                    </Link>
                                    
                                    <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <div className="text-lg font-black text-slate-900">
                                            Rp {product.price?.toLocaleString()}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                addToBasket(product, 1);
                                            }}
                                            disabled={product.stock_qty <= 0 || (allShipmentSkus.has(product.sku) && (storeQuotas[product.sku] || 0) <= 0)}
                                            className={`p-3 rounded-2xl transition-all ${
                                                inBasket 
                                                ? 'bg-emerald-500 text-white shadow-emerald-200' 
                                                : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-slate-200 shadow-lg'
                                            } disabled:opacity-30 disabled:grayscale`}
                                        >
                                            {inBasket ? <Check size={20} /> : <ShoppingCart size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <>
                    {/* Mobile Card View for List Mode */}
                    <div className="block md:hidden space-y-4">
                        {products.map(product => {
                            const inBasket = (items || []).some(item => item.id === product.id);
                            const imageUrl = product.primary_image_url 
                                ? supabase.storage.from('product-images').getPublicUrl(product.primary_image_url).data.publicUrl
                                : null;
                            const remainingQuota = storeQuotas[product.sku] || 0;
                            const isQuotaManaged = allShipmentSkus.has(product.sku);

                            return (
                                <div key={product.id} className="bg-white rounded-[2rem] border border-slate-200 p-4 shadow-sm flex flex-col gap-4">
                                    <Link to={`/product/${product.id}`} className="flex items-center gap-4">
                                        <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-50">
                                            {imageUrl ? (
                                                <img src={imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                    <Package size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <p className="text-sm font-bold text-slate-900 leading-tight">{product.name}</p>
                                                {activeBadges.has(product.id) && (
                                                    <span className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[8px] font-black uppercase tracking-tighter flex items-center gap-1">
                                                        <Sparkles size={8} /> New Drop
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-mono text-slate-400 mb-2">{product.sku}</p>
                                            <p className="text-sm font-black text-slate-900">Rp {product.price?.toLocaleString()}</p>
                                        </div>
                                    </Link>
                                    
                                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${product.stock_qty > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            Stock: {product.stock_qty}
                                        </span>
                                        {isQuotaManaged ? (
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${remainingQuota > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
                                                <Sparkles size={10} /> Quota: {remainingQuota}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">General Quota</span>
                                        )}
                                    </div>
                                    
                                    <button
                                        onClick={() => addToBasket(product, 1)}
                                        disabled={product.stock_qty <= 0 || (isQuotaManaged && remainingQuota <= 0)}
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                                            inBasket 
                                            ? 'bg-emerald-500 text-white shadow-emerald-100 shadow-lg' 
                                            : 'bg-slate-900 text-white hover:bg-indigo-600 hover:shadow-indigo-100 hover:shadow-lg'
                                        } disabled:opacity-30 disabled:grayscale`}
                                    >
                                        {inBasket ? <Check size={16} /> : <ShoppingCart size={16} />}
                                        {inBasket ? 'In Basket' : 'Add to Basket'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop Table View for List Mode */}
                    <div className="hidden md:block bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-premium">
                        <table className="w-full text-left border-collapse table-fixed">
                            <colgroup>
                                <col className="w-[40%]" />
                                <col className="w-[15%]" />
                                <col className="w-[15%]" />
                                <col className="w-[15%]" />
                                <col className="w-[15%]" />
                            </colgroup>
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Product</th>
                                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Price</th>
                                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Warehouse Stock</th>
                                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Your Quota</th>
                                    <th className="px-6 py-5 text-center text-xs font-black uppercase tracking-widest text-slate-400">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {products.map(product => {
                                    const inBasket = (items || []).some(item => item.id === product.id);
                                    const imageUrl = product.primary_image_url 
                                        ? supabase.storage.from('product-images').getPublicUrl(product.primary_image_url).data.publicUrl
                                        : null;
                                    const remainingQuota = storeQuotas[product.sku] || 0;
                                    const isQuotaManaged = allShipmentSkus.has(product.sku);

                                    return (
                                        <tr key={product.id} className="group hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <Link to={`/product/${product.id}`} className="flex items-center gap-4 overflow-hidden">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-50">
                                                        {imageUrl ? (
                                                            <img src={imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                <Package size={20} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors whitespace-normal leading-snug">{product.name}</p>
                                                            {activeBadges.has(product.id) && (
                                                                <span className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[8px] font-black uppercase tracking-tighter flex items-center gap-1">
                                                                    <Sparkles size={8} /> New Drop
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-mono text-slate-400">{product.sku}</p>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-black text-slate-900">Rp {product.price?.toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${product.stock_qty > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                    {product.stock_qty} Units
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isQuotaManaged ? (
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit ${remainingQuota > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
                                                        <Sparkles size={10} /> {remainingQuota} Left
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">General</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => addToBasket(product, 1)}
                                                    disabled={product.stock_qty <= 0 || (isQuotaManaged && remainingQuota <= 0)}
                                                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-w-[140px] ${
                                                        inBasket 
                                                        ? 'bg-emerald-500 text-white shadow-emerald-100 shadow-lg' 
                                                        : 'bg-slate-900 text-white hover:bg-indigo-600 hover:shadow-indigo-100 hover:shadow-lg'
                                                    } disabled:opacity-30 disabled:grayscale`}
                                                >
                                                    {inBasket ? <Check size={16} /> : <ShoppingCart size={16} />}
                                                    {inBasket ? 'In Basket' : 'Add to Basket'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {totalCount > ITEMS_PER_PAGE && (
                <div className="flex justify-center items-center gap-2 mt-16">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:grayscale transition-all shadow-sm"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, Math.ceil(totalCount / ITEMS_PER_PAGE)) }).map((_, i) => {
                            const pageNum = i + 1;
                            // Basic pagination logic to show current window
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => handlePageChange(pageNum)}
                                    className={`w-12 h-12 rounded-xl font-black text-sm transition-all shadow-sm border ${
                                        currentPage === pageNum 
                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-100' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-500'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        {Math.ceil(totalCount / ITEMS_PER_PAGE) > 5 && (
                            <span className="px-4 text-slate-300 font-bold">...</span>
                        )}
                        {Math.ceil(totalCount / ITEMS_PER_PAGE) > 5 && (
                            <button
                                onClick={() => handlePageChange(Math.ceil(totalCount / ITEMS_PER_PAGE))}
                                className={`w-12 h-12 rounded-xl font-black text-sm transition-all shadow-sm border ${
                                    currentPage === Math.ceil(totalCount / ITEMS_PER_PAGE) 
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-100' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-500'
                                }`}
                            >
                                {Math.ceil(totalCount / ITEMS_PER_PAGE)}
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === Math.ceil(totalCount / ITEMS_PER_PAGE)}
                        className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:grayscale transition-all shadow-sm"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {products.length === 0 && !loading && (
                <div className="text-center py-24">
                    <Package className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-slate-400 font-bold italic">No products match your search or warehouse permissions.</p>
                </div>
            )}
        </div>
    );
};
