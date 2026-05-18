import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, ShoppingBag, Clock, CheckCircle2, AlertCircle, ChevronLeft, Package, User, MapPin, FileDown, Sparkles, Eye, Search, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CatalogueProduct } from '../CatalogueProduct';

export const StoreOrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [quotas, setQuotas] = useState<Record<string, number>>({});
    const [error, setError] = useState<string | null>(null);
    const [activeBadges, setActiveBadges] = useState<Set<string>>(new Set());
    const [previewProductId, setPreviewProductId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (id) fetchOrderDetail();
    }, [id]);

    const fetchOrderDetail = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data, error: fetchError } = await supabase
                .from('store_orders')
                .select(`
                    *,
                    store:destination_locations(id, name),
                    items:store_order_items(
                        *,
                        product:products(
                            id,
                            name, 
                            sku,
                            price,
                            discount_price,
                            images:product_images(image_url)
                        )
                    )
                `)
                .eq('id', id)
                .single();
            
            if (fetchError) throw fetchError;
            setOrder(data);

            const productIds = data.items.map((i: any) => i.product?.id);
            const skus = data.items.map((i: any) => i.product?.sku);

            const [quotaData, badgeData] = await Promise.all([
                // Fetch Quotas (for store's own context)
                (async () => {
                    if (!data?.store?.id) return {};

                    const [{ data: shipmentExistence }, { data: allocations }, { data: previousOrderItems }] = await Promise.all([
                        supabase.from('shipment_items').select('sku').in('sku', skus),
                        supabase.from('shipment_store_allocations').select('quantity, shipment_item:shipment_items!inner(sku)').eq('store_name', data.store.name).in('shipment_item.sku', skus),
                        supabase.from('store_order_items').select('quantity, product:products!inner(sku), order:store_orders!inner(status, store_id)').eq('order.store_id', data.store.id).not('order.status', 'eq', 'Rejected').in('product.sku', skus)
                    ]);

                    const existingInShipments = new Set(shipmentExistence?.map(s => s.sku));
                    const quotaMap: Record<string, number> = {};

                    allocations?.forEach((a: any) => {
                        const s = a.shipment_item?.sku;
                        if (s && existingInShipments.has(s)) quotaMap[s] = (quotaMap[s] || 0) + a.quantity;
                    });
                    previousOrderItems?.forEach((o: any) => {
                        const s = o.product?.sku;
                        if (s && quotaMap[s] !== undefined) quotaMap[s] = (quotaMap[s] || 0) - o.quantity;
                    });

                    const finalQuotas: Record<string, number> = {};
                    skus.forEach((sku: string) => {
                        if (existingInShipments.has(sku)) finalQuotas[sku] = quotaMap[sku] || 0;
                    });
                    return finalQuotas;
                })(),

                // Fetch New Drops Badges
                (async () => {
                    const { data: activeBuckets } = await supabase.from('new_drops_items').select('product_id, batch:new_drops_batches!inner(is_badge_active)').in('product_id', productIds).eq('batch.is_badge_active', true);
                    return new Set(activeBuckets?.map(b => b.product_id));
                })()
            ]);

            setQuotas(quotaData as any);
            setActiveBadges(badgeData as any);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to fetch order details');
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = useMemo(() => {
        if (!order?.items) return [];
        return order.items.filter((item: any) => {
            const searchStr = searchTerm.toLowerCase();
            const name = (item.product?.name || '').toLowerCase();
            const sku = (item.product?.sku || '').toLowerCase();
            return name.includes(searchStr) || sku.includes(searchStr);
        });
    }, [order?.items, searchTerm]);

    const calculateItemPrice = (item: any) => {
        return item.unit_price || item.product?.price || 0;
    };

    const grandTotal = order?.items?.reduce((sum: number, i: any) => sum + (calculateItemPrice(i) * i.quantity), 0) || 0;

    const handleExportExcel = () => {
        if (!order) return;
        const exportData = order.items.map((item: any) => ({
            'SKU': item.product?.sku || '',
            'PRODUCT NAME': item.product?.name || '',
            'ORDER QTY': item.quantity || 0,
            'PRODUCT PRICE': calculateItemPrice(item),
            'DESTINATION STORE': order.store?.name || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Order Details");

        XLSX.writeFile(workbook, `My_Order_${order.id.slice(0, 8)}.xlsx`);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 animate-pulse">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Retrieving Order details...</p>
        </div>
    );

    if (error) return (
        <div className="p-20 text-center">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-black text-slate-900">Error Loading Order</h2>
            <p className="text-slate-500 mt-2">{error}</p>
            <button onClick={() => navigate('/store/orders')} className="mt-6 text-indigo-600 font-bold flex items-center gap-2 mx-auto">
                <ChevronLeft size={20} /> Back to My Orders
            </button>
        </div>
    );

    if (!order) return (
        <div className="p-20 text-center">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-black text-slate-900">Order Not Found</h2>
            <button onClick={() => navigate('/store/orders')} className="mt-6 text-indigo-600 font-bold flex items-center gap-2 mx-auto">
                <ChevronLeft size={20} /> Back to My Orders
            </button>
        </div>
    );

    const totalQty = order.items?.reduce((sum: number, i: any) => sum + i.quantity, 0);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <button onClick={() => navigate('/store/orders')} className="text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 mb-4 transition-colors">
                        <ChevronLeft size={16} /> Back to My Orders
                    </button>
                    <div className="flex items-center gap-4 mb-2">
                        <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Order #{order.id.slice(0, 8)}</span>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            order.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                            order.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 shadow-emerald-100 shadow-lg' :
                            order.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                            'bg-indigo-100 text-indigo-700'
                        }`}>
                            {order.status}
                        </div>
                    </div>
                    <h1 className="text-5xl font-black tracking-tight text-slate-900">Order Details</h1>
                </div>
                <button 
                    onClick={handleExportExcel}
                    className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
                >
                    <FileDown size={20} />
                    Export Excel
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-premium overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h3 className="font-black text-slate-900 flex items-center gap-3">
                                <Package size={18} className="text-indigo-600" />
                                Items List
                            </h3>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input 
                                        type="text"
                                        placeholder="Filter SKU or Name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                    />
                                    {searchTerm && (
                                        <button 
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 whitespace-nowrap">
                                    {filteredItems.length} / {order.items?.length} SKUs
                                </span>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {filteredItems.map((item: any) => (
                                <div key={item.id} className="p-6 hover:bg-slate-50/50 transition-colors group">
                                    <div className="flex items-center gap-6">
                                        <div 
                                            className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-50 relative cursor-zoom-in"
                                            onClick={() => setPreviewProductId(item.product?.id)}
                                        >
                                            {item.product?.images?.[0]?.image_url ? (
                                                <img 
                                                    src={supabase.storage.from('product-images').getPublicUrl(item.product.images[0].image_url).data.publicUrl} 
                                                    alt="" 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={28} /></div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                <Eye className="text-white" size={20} />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-black text-slate-900 truncate">{item.product?.name}</h4>
                                                {activeBadges.has(item.product?.id) && (
                                                    <span className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 shrink-0 animate-pulse">
                                                        <Sparkles size={8} /> New Drop
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 font-mono font-bold tracking-tighter uppercase">{item.product?.sku}</p>
                                            <div className="flex gap-3 mt-2">
                                                {quotas[item.product?.sku] !== undefined && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase">
                                                        <CheckCircle2 size={10} /> Quota: {quotas[item.product?.sku]}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-slate-900 leading-none mb-1">x{item.quantity}</p>
                                            <p className="text-[10px] font-black text-indigo-600 uppercase">Rp {calculateItemPrice(item).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-premium">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Order Summary</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                <span className="text-slate-500 font-bold text-sm">Total SKUs</span>
                                <span className="text-slate-900 font-black">{order.items?.length}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                <span className="text-slate-500 font-bold text-sm">Total Quantity</span>
                                <span className="text-slate-900 font-black">{totalQty}</span>
                            </div>
                            <div className="pt-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Total Order Value</span>
                                <p className="text-3xl font-black text-indigo-600 tracking-tighter">Rp {grandTotal.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Timeline</h3>
                        <div className="space-y-4 text-xs font-bold">
                            <div className="flex gap-4">
                                <div className="w-4 h-4 rounded-full bg-indigo-600 shrink-0 border-4 border-white shadow-sm" />
                                <div>
                                    <p className="text-slate-900">Submitted</p>
                                    <p className="text-slate-400 font-medium">{new Date(order.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            {order.status !== 'Pending' && (
                                <div className="flex gap-4">
                                    <div className="w-4 h-4 rounded-full bg-emerald-500 shrink-0 border-4 border-white shadow-sm" />
                                    <div>
                                        <p className="text-slate-900">Status Updated: {order.status}</p>
                                        <p className="text-slate-400 font-medium">{new Date(order.updated_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Preview Modal */}
            {previewProductId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-[4rem] shadow-2xl overflow-hidden flex flex-col">
                        <button 
                            onClick={() => setPreviewProductId(null)}
                            className="absolute top-8 right-8 z-20 p-4 bg-slate-100/50 hover:bg-slate-100 text-slate-900 rounded-full backdrop-blur-sm transition-all"
                        >
                            <AlertCircle size={32} />
                        </button>
                        <div className="flex-1 overflow-y-auto">
                            <CatalogueProduct isModal={true} modalProductId={previewProductId} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
