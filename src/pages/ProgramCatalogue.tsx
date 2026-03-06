import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ProductWithImages } from '../types/product';
import type { Program } from '../types/program';
import { Search, SlidersHorizontal, Loader2, Tag, AlertCircle } from 'lucide-react';
import { formatIDR } from '../lib/utils';
import { Link, useParams } from 'react-router-dom';

export const ProgramCatalogue = () => {
    const { id: programId } = useParams<{ id: string }>();
    const [program, setProgram] = useState<Program | null>(null);
    const [products, setProducts] = useState<ProductWithImages[]>([]);
    const [loading, setLoading] = useState(true);
    const [programLoading, setProgramLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

    // Pagination
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const ITEMS_PER_PAGE = 24;

    // Filters
    const [categoryFilter, setCategoryFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');

    // Filter Options
    const [categories, setCategories] = useState<string[]>([]);
    const [brands, setBrands] = useState<string[]>([]);

    useEffect(() => {
        const fetchProgramDetails = async () => {
            if (!programId) return;
            setProgramLoading(true);
            try {
                const { data, error } = await supabase
                    .from('programs')
                    .select('*')
                    .eq('id', programId)
                    .single();

                if (error) throw error;
                setProgram(data);
            } catch (err) {
                console.error("Failed to load program", err);
            } finally {
                setProgramLoading(false);
            }
        };
        fetchProgramDetails();
    }, [programId]);

    useEffect(() => {
        // Fetch unique categories and brands for the SKUs in this program
        const fetchFilters = async () => {
            if (!program || !program.skus || program.skus.length === 0) return;
            try {
                const { data } = await supabase
                    .from('products')
                    .select('category, brand')
                    .in('sku', program.skus);
                if (data) {
                    const uniqueCategories = Array.from(new Set(data.map(p => p.category).filter(Boolean))) as string[];
                    const uniqueBrands = Array.from(new Set(data.map(p => p.brand).filter(Boolean))) as string[];
                    setCategories(uniqueCategories.sort());
                    setBrands(uniqueBrands.sort());
                }
            } catch (err) {
                console.error("Failed to load filters", err);
            }
        };
        fetchFilters();
    }, [program]);

    useEffect(() => {
        // Reset page and debounce search slightly for better performance
        setPage(1);
        const timeoutId = setTimeout(() => {
            if (program) {
                fetchProducts(1);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, sortOption, categoryFilter, brandFilter, program]);

    const fetchProducts = async (pageNumber: number) => {
        if (!program || !program.skus || program.skus.length === 0) {
            setProducts([]);
            setLoading(false);
            return;
        }

        if (pageNumber === 1) setLoading(true);
        else setLoadingMore(true);
        try {
            let query = supabase
                .from('products')
                .select(`
                    *,
                    images:product_images(*)
                `)
                .in('sku', program.skus);

            // Apply search
            if (searchQuery.trim() !== '') {
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
        const nextPage = page + 1;
        setPage(nextPage);
        fetchProducts(nextPage);
    };

    if (programLoading) {
        return (
            <div className="py-24 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                <p className="text-slate-500 font-medium">Loading program details...</p>
            </div>
        );
    }

    if (!program || !program.is_active) {
        return (
            <div className="py-24 text-center border border-slate-200 rounded-3xl bg-white shadow-sm mt-8 p-12 max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={28} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Program Not Found</h3>
                <p className="text-slate-500">This promotional program doesn't exist or is no longer active.</p>
                <Link to="/" className="inline-block mt-6 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors">
                    Back to Catalogue
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Program Header Banner */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-3xl p-8 sm:p-10 shadow-premium text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Tag size={120} />
                </div>
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-white/20">
                        <Tag size={12} />
                        Special Program
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">{program.name}</h1>
                    {program.period && (
                        <p className="text-indigo-100 font-medium mb-4 flex items-center gap-2">
                            {program.period}
                        </p>
                    )}
                    {program.description && (
                        <p className="text-indigo-50 max-w-2xl text-sm sm:text-base leading-relaxed">
                            {program.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Minimalist Header & Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass p-4 rounded-2xl border border-border shadow-glass">
                <div className="relative w-full md:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by SKU or Product Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full md:w-auto appearance-none bg-white border border-slate-200 text-slate-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm cursor-pointer shadow-sm hover:bg-slate-50 transition-colors"
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Brand Filter */}
                    <select
                        value={brandFilter}
                        onChange={(e) => setBrandFilter(e.target.value)}
                        className="w-full md:w-auto appearance-none bg-white border border-slate-200 text-slate-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm cursor-pointer shadow-sm hover:bg-slate-50 transition-colors"
                    >
                        <option value="">All Brands</option>
                        {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>

                    <div className="relative w-full md:w-auto flex items-center">
                        <div className="absolute left-3 pointer-events-none text-slate-500">
                            <SlidersHorizontal size={16} />
                        </div>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as any)}
                            className="w-full md:w-auto appearance-none bg-white border border-slate-200 text-slate-700 py-3 pl-10 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm cursor-pointer shadow-sm hover:bg-slate-50 transition-colors"
                        >
                            <option value="newest">Newest Arrivals</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                    <p className="text-slate-500 font-medium">Loading products...</p>
                </div>
            ) : products.length === 0 ? (
                <div className="py-24 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No products found</h3>
                    <p className="text-slate-500 max-w-md mx-auto">There are no products in this program matching "{searchQuery}".</p>
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
                                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium tracking-widest text-sm">
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
                                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-wider">
                                        <span>{product.brand || 'BNS'}</span>
                                        {product.sku && (
                                            <>
                                                <span>•</span>
                                                <span>{product.sku}</span>
                                            </>
                                        )}
                                    </div>
                                    <h3 className="font-display font-semibold text-foreground text-sm md:text-base leading-tight group-hover:underline underline-offset-4 decoration-border line-clamp-2">
                                        {product.name}
                                    </h3>
                                    <div className="pt-1 flex items-baseline gap-2">
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
                    <p className="text-sm text-muted-foreground font-medium">You've reached the end of the collection.</p>
                </div>
            )}
        </div>
    );
};
