import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { ProductWithImages } from '../types/product';
import type { Warehouse } from '../types/warehouse';
import { formatIDR } from '../lib/utils';
import { Loader2, ArrowLeft, ZoomIn, Plus, Minus, ShoppingCart, CheckCircle2, MapPin } from 'lucide-react';
import { useStoreSettings } from '../features/catalogue/StoreSettingsContext';
import { useBasket } from '../features/catalogue/BasketContext';
import { useAuthStore } from '../features/auth/useAuthStore';

export const CatalogueProduct = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { settings } = useStoreSettings();
    const [product, setProduct] = useState<ProductWithImages | null>(null);
    const [availableWarehouses, setAvailableWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isZoomed, setIsZoomed] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
    const [quantity, setQuantity] = useState(1);
    const [addedToBasket, setAddedToBasket] = useState(false);
    const { addToBasket } = useBasket();
    const user = useAuthStore(state => state.user);
    const requestorRoles = ['putus', 'BELI_PUTUS', 'ONLINE', 'CONSIGNMENT', 'STORE', 'EXPO', 'MKT', 'VM'];
    const isRequestor = requestorRoles.includes(user?.user_metadata?.role || '');

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isZoomed) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePosition({ x, y });
    };

    useEffect(() => {
        if (id) fetchProduct(id);
    }, [id]);

    const fetchProduct = async (productId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select(`
                    *,
                    images:product_images(*)
                `)
                .eq('id', productId)
                .single();

            if (error) throw error;
            setProduct(data as any);

            // Set initial selected image
            if (data && data.images && data.images.length > 0) {
                const sortedImages = data.images.sort((a: any, b: any) => a.display_order - b.display_order);
                setSelectedImage(sortedImages[0].image_url);
            }

            // Fetch available stock locations (warehouses)
            const { data: stockData, error: stockError } = await supabase
                .from('warehouse_stocks')
                .select(`
                    quantity,
                    warehouses!inner (
                        id,
                        name,
                        is_visible
                    )
                `)
                .eq('product_id', productId)
                .gt('quantity', 0);
            
            if (stockError) {
                console.error("Error fetching stock data:", stockError);
            } else if (stockData) {
                // Map to unique, visible warehouses
                const visibleWarehouses = stockData
                    .map(s => s.warehouses as unknown as Warehouse)
                    .filter(w => w.is_visible);
                
                // Deduplicate just in case
                const uniqueWarehouses = Array.from(new Map(visibleWarehouses.map(w => [w.id, w])).values());
                setAvailableWarehouses(uniqueWarehouses);
            }

        } catch (error) {
            console.error('Error fetching product details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToBasket = () => {
        if (product) {
            addToBasket(product, quantity);
            setAddedToBasket(true);
            setTimeout(() => setAddedToBasket(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                <p>Loading product details...</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Product Not Found</h2>
                <p className="text-slate-500 mb-6">The product you are looking for does not exist.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition"
                >
                    <ArrowLeft size={16} /> Back to Catalogue
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in-up">
            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Back to Catalogue
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Image Gallery */}
                <div className="space-y-4">
                    <div
                        className={`relative aspect-square rounded-2xl border border-slate-200 bg-white overflow-hidden group ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                        onClick={() => setIsZoomed(!isZoomed)}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => setIsZoomed(false)}
                    >
                        {selectedImage ? (
                            <div
                                className="w-full h-full transition-transform duration-200 ease-out"
                                style={{
                                    backgroundImage: `url(${supabase.storage.from('product-images').getPublicUrl(selectedImage).data.publicUrl})`,
                                    backgroundPosition: isZoomed ? `${mousePosition.x}% ${mousePosition.y}%` : 'center',
                                    backgroundSize: isZoomed ? '250%' : 'contain',
                                    backgroundRepeat: 'no-repeat'
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                No Image Available
                            </div>
                        )}
                        {!isZoomed && selectedImage && (
                            <div className="absolute top-4 right-4 bg-white/80 backdrop-blur text-slate-700 p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <ZoomIn size={20} />
                            </div>
                        )}
                    </div>

                    {product.images && product.images.length > 1 && (
                        <div className="grid grid-cols-4 gap-4">
                            {product.images.sort((a: any, b: any) => a.display_order - b.display_order).map((img, index) => (
                                <button
                                    key={img.id || index}
                                    onClick={() => setSelectedImage(img.image_url)}
                                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${selectedImage === img.image_url
                                        ? 'border-indigo-600 ring-4 ring-indigo-600/20'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <img
                                        src={supabase.storage.from('product-images').getPublicUrl(img.image_url).data.publicUrl}
                                        alt="Thumbnail"
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Details */}
                <div className="flex flex-col">
                    <div className="mb-4 flex flex-wrap gap-2">
                        {/* Brand hidden */}
                        {product.category && (
                            <span className="inline-block px-3 py-1 bg-muted text-muted-foreground font-medium text-xs rounded-md">
                                {product.category}
                            </span>
                        )}
                        <span className="inline-block px-3 py-1 bg-muted text-muted-foreground font-mono text-xs font-semibold rounded-md tracking-wider">
                            SKU: {product.sku}
                        </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-foreground mb-4 leading-tight text-balance">
                        {product.name}
                    </h1>

                    <div className="mb-8 flex items-center gap-4">
                        {product.discount_price ? (
                            <>
                                <span className="text-3xl font-display font-bold text-foreground">{formatIDR(product.discount_price)}</span>
                                <span className="text-xl text-red-500 line-through font-medium">{formatIDR(product.price)}</span>
                                <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-md uppercase tracking-wider">Sale</span>
                            </>
                        ) : (
                            <span className="text-3xl font-display font-bold text-foreground">{formatIDR(product.price)}</span>
                        )}
                    </div>

                    {availableWarehouses.length > 0 && (
                        <div className="mb-8 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <MapPin size={14} className="text-indigo-500" /> Available In:
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {availableWarehouses.map(wh => (
                                    <span key={wh.id} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white text-slate-700 border border-slate-200 shadow-sm">
                                        {wh.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="prose prose-slate text-slate-600 mb-8 border-t border-slate-100 pt-8">
                        <p>This is a premium piece from the BNS Hype catalogue. All items are meticulously verified and handled with the utmost care for our discerning customers.</p>

                        {product.barcode && (
                            <div className="mt-6 pt-6 border-t border-slate-50">
                                <p className="text-xs font-mono text-slate-400">Barcode / UPC</p>
                                <p className="text-sm font-medium text-slate-700">{product.barcode}</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-8 space-y-4">
                        {isRequestor && (
                            <div className="flex items-center gap-4">
                                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden h-14 bg-white">
                                    <button
                                        onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                                        className="px-4 hover:bg-slate-50 text-slate-500 transition-colors"
                                    >
                                        <Minus size={18} />
                                    </button>
                                    <div className="w-12 text-center text-lg font-bold tabular-nums">
                                        {quantity}
                                    </div>
                                    <button
                                        onClick={() => setQuantity(prev => prev + 1)}
                                        className="px-4 hover:bg-slate-50 text-slate-500 transition-colors"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                                <button
                                    onClick={handleAddToBasket}
                                    className={`flex-[2] flex items-center justify-center gap-2 font-bold py-4 rounded-xl transition shadow-premium active:scale-[0.98] ${addedToBasket ? 'bg-emerald-500 text-white' : 'bg-zinc-950 text-white hover:bg-zinc-800'
                                        }`}
                                >
                                    {addedToBasket ? (
                                        <>
                                            <CheckCircle2 size={20} />
                                            Added to Basket
                                        </>
                                    ) : (
                                        <>
                                            <ShoppingCart size={20} />
                                            Add to Basket
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {settings?.whatsapp_number && (
                            <a
                                href={`https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, '')}?text=Hi! I am interested in purchasing ${product.name} (SKU: ${product.sku}). Is it still available?`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-4 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition text-center"
                            >
                                Contact via WhatsApp
                            </a>
                        )}

                        {settings?.contact_url && (
                            <a
                                href={settings.contact_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-4 bg-zinc-950 text-white font-bold rounded-xl hover:bg-zinc-800 transition text-center shadow-premium"
                            >
                                Contact Us
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
