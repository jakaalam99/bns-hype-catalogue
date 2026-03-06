import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { ProductWithImages } from '../types/product';
import { formatIDR } from '../lib/utils';
import { Loader2, ArrowLeft, ZoomIn } from 'lucide-react';
import { useStoreSettings } from '../features/catalogue/StoreSettingsContext';

export const CatalogueProduct = () => {
    const { id } = useParams<{ id: string }>();
    const { settings } = useStoreSettings();
    const [product, setProduct] = useState<ProductWithImages | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isZoomed, setIsZoomed] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

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
        } catch (error) {
            console.error('Error fetching product details:', error);
        } finally {
            setLoading(false);
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
                <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                    <ArrowLeft size={16} /> Back to Catalogue
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in-up">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Back to Catalogue
            </Link>

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
                        {product.brand && (
                            <span className="inline-block px-3 py-1 bg-muted text-foreground font-medium text-xs rounded-md">
                                {product.brand}
                            </span>
                        )}
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

                    <div className="prose prose-slate text-slate-600 mb-8 border-t border-slate-100 pt-8">
                        <p>This is a premium piece from the BNS Hype catalogue. All items are meticulously verified and handled with the utmost care for our discerning customers.</p>

                        {product.barcode && (
                            <div className="mt-6 pt-6 border-t border-slate-50">
                                <p className="text-xs font-mono text-slate-400">Barcode / UPC</p>
                                <p className="text-sm font-medium text-slate-700">{product.barcode}</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-8 flex gap-4">
                        {settings?.whatsapp_number ? (
                            <a
                                href={`https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, '')}?text=Hi! I am interested in purchasing ${product.name} (SKU: ${product.sku}). Is it still available?`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 bg-foreground text-background font-bold py-4 rounded-xl hover:bg-zinc-800 transition shadow-premium hover:-translate-y-1 active:scale-[0.98] text-center"
                            >
                                Contact to Purchase
                            </a>
                        ) : (
                            <button disabled className="flex-1 bg-muted text-muted-foreground font-bold py-4 rounded-xl cursor-not-allowed">
                                Contact Unavailable
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
