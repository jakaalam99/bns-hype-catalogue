import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ProductWithImages } from '../types/product';
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import { formatIDR } from '../lib/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { useBasket } from '../features/catalogue/BasketContext';
import { Plus, Minus, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../features/auth/useAuthStore';

export const Catalogue = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const [products, setProducts] = useState<ProductWithImages[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToBasket } = useBasket();
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());
    const user = useAuthStore(state => state.user);
    const requestorRoles = ['putus', 'BELI_PUTUS', 'ONLINE', 'CONSIGNMENT', 'STORE', 'EXPO', 'MKT', 'VM'];
    const isRequestor = requestorRoles.some(r => r.toUpperCase() === (user?.user_metadata?.role || '').toUpperCase());

    // Filters from URL
    const searchQuery = searchParams.get('q') || '';
    const categoryFilter = searchParams.get('category') || '';
    const brandFilter = searchParams.get('brand') || '';
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

    // Filter Options
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const { data, error } = await supabase.rpc('get_filtered_categories', {
                    search_text: searchQuery,
                    brand_text: brandFilter
                });

                if (error) throw error;
                if (data) {
                    setCategories(data.map((row: any) => row.category));
                }
            } catch (err) {
                console.error("Failed to load dynamic filters", err);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchFilterOptions();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, categoryFilter, brandFilter]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchProducts(page);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, sortOption, categoryFilter, brandFilter, page]);

    const fetchProducts = async (pageNumber: number) => {
        if (pageNumber === 1) setLoading(true);
        else setLoadingMore(true);
        try {
            let query = supabase
                .from('products')
                .select(`
                    *,
                    images:product_images(*),
                    warehouse_stocks(quantity)
                `)
                .eq('is_active', true);

            // Apply search
            if (searchQuery.trim() !== '') {
                // Supabase syntax for combining OR conditions
                query = query.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
            }

            // Apply Filters
            if (categoryFilter) {
                query = query.eq('category', categoryFilter);
            }
            if (brandFilter) {
                query = query.eq('brand', brandFilter);
            }

            // Apply sorting
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

            // Calculate range
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
            console.error('Error fetching public products:', error);
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

        // Show success state
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

        // Reset quantity for this product
        setQuantities(prev => ({ ...prev, [product.id]: 1 }));
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Minimalist Controls (Solid Dark) */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-end bg-zinc-950 p-6 rounded-2xl border border-white/10 shadow-premium relative z-10">

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Category Filter */}
                    <div className="relative w-full md:w-auto">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full md:w-auto appearance-none bg-zinc-900 border border-white/5 text-zinc-300 py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 font-medium text-sm cursor-pointer shadow-sm hover:bg-zinc-800 transition-colors"
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>

                    {/* Brand Filter hidden from public */}

                    <div className="relative w-full md:w-auto flex items-center">
                        <div className="absolute left-3 pointer-events-none text-zinc-500">
                            <SlidersHorizontal size={16} />
                        </div>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as any)}
                            className="w-full md:w-auto appearance-none bg-zinc-900 border border-white/5 text-zinc-300 py-3 pl-10 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 font-medium text-sm cursor-pointer shadow-sm hover:bg-zinc-800 transition-colors"
                        >
                            <option value="newest">Newest Arrivals</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                    <p className="text-slate-500 font-medium">Loading catalogue...</p>
                </div>
            ) : products.length === 0 ? (
                <div className="py-24 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No products found</h3>
                    <p className="text-slate-500 max-w-md mx-auto">We couldn't find any products matching "{searchQuery}". Try checking for typos or using different keywords.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
                    {products.map((product, index) => {
                        const primaryImage = product.images?.find((img: any) => img.display_order === 0) || product.images?.[0];

                        return (
                            <Link key={product.id} to={`/product/${product.id}`} className="group block cursor-pointer hover-card rounded-2xl p-3 bg-surface border border-transparent hover:border-border" style={{ animationDelay: `${index * 50}ms` }}>
                                <div className="aspect-[4/5] bg-muted rounded-xl overflow-hidden mb-4 relative">
                                    {primaryImage ? (
                                        <img
                                            src={supabase.storage.from('product-images').getPublicUrl(primaryImage.image_url).data.publicUrl}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-sans font-medium tracking-widest text-sm">
                                            BNS HYPE
                                        </div>
                                    )}

                                    {/* Minimalist View Overlay */}
                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    {/* Discount Badge */}
                                    {product.discount_price && product.price > product.discount_price && (
                                        <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                                            -{Math.round(((product.price - product.discount_price) / product.price) * 100)}%
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-widest">
                                        {/* Brand hidden */}
                                        {product.sku && (
                                            <span>{product.sku}</span>
                                        )}
                                    </div>
                                    <h3 className="font-display font-semibold text-foreground text-sm md:text-base leading-tight group-hover:underline underline-offset-4 decoration-border line-clamp-2">
                                        {product.name}
                                    </h3>
                                    <div className="pt-1 flex items-baseline justify-between gap-2">
                                        <div className="flex items-baseline gap-2">
                                            {product.discount_price ? (
                                                <>
                                                    <span className="font-bold text-slate-900">{formatIDR(product.discount_price)}</span>
                                                    <span className="text-xs md:text-sm text-red-500 line-through">{formatIDR(product.price)}</span>
                                                </>
                                            ) : (
                                                <span className="font-bold text-slate-900">{formatIDR(product.price)}</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {isRequestor && (
                                        <div className="pt-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                                Stock: {product.warehouse_stocks?.reduce((acc, curr) => acc + curr.quantity, 0) || 0}
                                            </span>
                                        </div>
                                    )}

                                    {/* Add to Basket Controls - Restricted to Requestor roles */}
                                    {isRequestor && (
                                        <div className="pt-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-8">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleQuantityChange(product.id, -1);
                                                    }}
                                                    className="px-2 hover:bg-slate-50 text-slate-500 transition-colors"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <div className="w-8 text-center text-xs font-semibold tabular-nums">
                                                    {quantities[product.id] || 1}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleQuantityChange(product.id, 1);
                                                    }}
                                                    className="px-2 hover:bg-slate-50 text-slate-500 transition-colors"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={(e) => onAddToBasket(e, product)}
                                                className={`flex-1 rounded-lg h-8 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${addedProducts.has(product.id)
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-zinc-950 text-white hover:bg-zinc-800'
                                                    }`}
                                            >
                                                {addedProducts.has(product.id) ? (
                                                    <>
                                                        <CheckCircle2 size={12} />
                                                        Added
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShoppingCart size={12} />
                                                        Add
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Pagination Load More */}
            {!loading && products.length > 0 && hasMore && (
                <div className="py-12 border-t border-border mt-12 text-center flex flex-col items-center">
                    <p className="text-sm text-muted-foreground mb-6 tracking-wide">Showing {products.length} Products</p>
                    <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="px-8 py-3 bg-foreground border border-border shadow-premium text-background font-bold text-sm tracking-tight rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loadingMore && <Loader2 size={16} className="animate-spin" />}
                        {loadingMore ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            )}

            {!loading && products.length > 0 && !hasMore && (
                <div className="py-12 border-t border-border mt-12 text-center">
                    <p className="text-sm text-muted-foreground font-medium">You've reached the end of the catalogue.</p>
                </div>
            )}
        </div>
    );
};
