import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, ShoppingBag, Clock, CheckCircle2, AlertCircle, ChevronLeft, Package, User, MapPin, FileDown, Eye, Search, X, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CatalogueProduct } from './CatalogueProduct';

export const AdminOrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [quotas, setQuotas] = useState<Record<string, number>>({});
    const [warehouseStocks, setWarehouseStocks] = useState<Record<string, number>>({});
    const [activeBadges, setActiveBadges] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [previewProductId, setPreviewProductId] = useState<string | null>(null);

    useEffect(() => {
        if (id) fetchOrderDetail();
    }, [id]);

    const fetchOrderDetail = async () => {
        try {
            setLoading(true);
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

            // Run secondary fetches in parallel for maximum speed
            const [quotaData, stockData, badgeData] = await Promise.all([
                // 1. Quotas & Shipment existence
                (async () => {
                    if (!data?.store?.id) return { finalQuotas: {} };
                    const storeName = data.store.name;

                    const [{ data: shipmentExistence }, { data: allocations }, { data: previousOrderItems }] = await Promise.all([
                        supabase.from('shipment_items').select('sku').in('sku', skus),
                        supabase.from('shipment_store_allocations').select('quantity, shipment_item:shipment_items!inner(sku)').eq('store_name', storeName).in('shipment_item.sku', skus),
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

                // 2. Warehouse Stocks
                (async () => {
                    const { data: storeConfig } = await supabase.from('store_warehouse_configs').select('allowed_warehouse_group_ids').eq('store_id', data.store.id).single();
                    if (!storeConfig?.allowed_warehouse_group_ids) return {};

                    const { data: stocks } = await supabase.from('warehouse_stocks').select('quantity, product_id, warehouse:warehouses!inner(group_id)').in('product_id', productIds).in('warehouse.group_id', storeConfig.allowed_warehouse_group_ids);
                    
                    const stockMap: Record<string, number> = {};
                    stocks?.forEach((s: any) => {
                        stockMap[s.product_id] = (stockMap[s.product_id] || 0) + s.quantity;
                    });
                    return stockMap;
                })(),

                // 3. New Drops Badges
                (async () => {
                    const { data: activeBuckets } = await supabase.from('new_drops_items').select('product_id, batch:new_drops_batches!inner(is_badge_active)').in('product_id', productIds).eq('batch.is_badge_active', true);
                    return new Set(activeBuckets?.map(b => b.product_id));
                })()
            ]);

            setQuotas(quotaData as any);
            setWarehouseStocks(stockData as any);
            setActiveBadges(badgeData as any);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to fetch order details');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (status: string) => {
        try {
            const { error } = await supabase
                .from('store_orders')
                .update({ status })
                .eq('id', id);
            if (error) throw error;
            setOrder({ ...order, status });
        } catch (err: any) {
            alert('Failed to update: ' + err.message);
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

        XLSX.writeFile(workbook, `Order_${order.id.slice(0, 8)}_${order.store?.name}.xlsx`);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Loading Order Details...</p>
        </div>
    );

    if (error) return (
        <div className="p-20 text-center">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-black text-slate-900">Error Loading Order</h2>
            <p className="text-slate-500 mt-2">{error}</p>
            <button onClick={() => navigate('/admin/orders')} className="mt-6 text-indigo-600 font-bold flex items-center gap-2 mx-auto">
                <ChevronLeft size={20} /> Back to Orders
            </button>
        </div>
    );

    if (!order) return (
        <div className="p-20 text-center">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-black text-slate-900">Order Not Found</h2>
            <button onClick={() => navigate('/admin/orders')} className="mt-6 text-indigo-600 font-bold flex items-center gap-2 mx-auto">
                <ChevronLeft size={20} /> Back to Orders
            </button>
        </div>
    );

    const totalQty = order.items?.reduce((sum: number, i: any) => sum + i.quantity, 0);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <button onClick={() => navigate('/admin/orders')} className="text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 mb-4 transition-colors">
                        <ChevronLeft size={16} /> Back to All Orders
                    </button>
                    <div className="flex items-center gap-4 mb-2">
                        <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Order #{order.id.slice(0, 8)}</span>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            order.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                            order.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                            order.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                            'bg-indigo-100 text-indigo-700'
                        }`}>
                            {order.status}
                        </div>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 flex items-center gap-4">
                        <MapPin size={32} className="text-indigo-600" />
                        {order.store?.name}
                    </h1>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                        onClick={handleExportExcel}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <FileDown size={18} />
                        Export Excel
                    </button>
                    {order.status === 'Pending' && (
                        <>
                            <button 
                                onClick={() => updateStatus('Rejected')}
                                className="flex-1 md:flex-none px-6 py-4 bg-white border border-red-200 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all"
                            >
                                Reject
                            </button>
                            <button 
                                onClick={() => updateStatus('Approved')}
                                className="flex-1 md:flex-none px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
                            >
                                Approve Order
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Items List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-premium overflow-hidden">
                        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h3 className="font-black text-slate-900 flex items-center gap-3">
                                <Package size={20} className="text-indigo-600" />
                                Order Items
                            </h3>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input 
                                        type="text"
                                        placeholder="Filter by SKU or Name..."
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
                        <div className="divide-y divide-slate-100">
                            {filteredItems.map((item: any) => (
                                <div key={item.id} className="p-8 hover:bg-slate-50/30 transition-colors group">
                                    <div className="flex items-start gap-8">
                                        <div 
                                            className="w-24 h-24 bg-slate-100 rounded-[2rem] overflow-hidden shrink-0 border border-slate-50 shadow-inner relative cursor-zoom-in"
                                            onClick={() => setPreviewProductId(item.product?.id)}
                                        >
                                            {item.product?.images?.[0]?.image_url ? (
                                                <img 
                                                    src={supabase.storage.from('product-images').getPublicUrl(item.product.images[0].image_url).data.publicUrl} 
                                                    alt="" 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={32} /></div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                <Eye className="text-white" size={24} />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 py-2">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h4 className="font-black text-xl text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{item.product?.name}</h4>
                                                        {activeBadges.has(item.product?.id) && (
                                                            <span className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 shrink-0">
                                                                <Sparkles size={8} /> New Drop
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400 font-mono tracking-tighter uppercase font-bold">{item.product?.sku}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-black text-slate-900 tracking-tighter">x{item.quantity}</p>
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase">Rp {calculateItemPrice(item).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-4 mt-6">
                                                {quotas[item.product?.sku] !== undefined && (
                                                    <div className="bg-indigo-50 px-4 py-2 rounded-xl">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">Quota Status</p>
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 size={14} className="text-indigo-600" />
                                                            <span className="text-sm font-black text-indigo-900">{quotas[item.product?.sku]} Available</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="bg-emerald-50 px-4 py-2 rounded-xl">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">Warehouse Stock</p>
                                                    <div className="flex items-center gap-2">
                                                        <Package size={14} className="text-emerald-600" />
                                                        <span className="text-sm font-black text-emerald-900">{warehouseStocks[item.product?.id] || 0} In Store Group</span>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Total Line</p>
                                                    <p className="text-sm font-black text-slate-900">Rp {(calculateItemPrice(item) * item.quantity).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-8">
                    <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-6 flex items-center gap-2">
                                <ShoppingBag size={14} /> Order Summary
                            </h3>
                            <div className="space-y-6">
                                <div className="flex justify-between items-end border-b border-white/10 pb-6">
                                    <span className="text-slate-400 font-bold text-sm">Total Items</span>
                                    <span className="text-4xl font-black leading-none">{totalQty}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-white/10 pb-6">
                                    <span className="text-slate-400 font-bold text-sm">SKU Diversity</span>
                                    <span className="text-2xl font-black leading-none">{order.items?.length}</span>
                                </div>
                                <div>
                                    <span className="text-indigo-300 font-black text-[10px] uppercase tracking-widest">Grand Total Amount</span>
                                    <p className="text-4xl font-black mt-1 tracking-tighter">Rp {grandTotal.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        {/* Decorative background element */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl" />
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-premium">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                            <User size={14} /> Metadata
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold">Submission Date</span>
                                <span className="text-slate-900 font-black">{new Date(order.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold">Updated At</span>
                                <span className="text-slate-900 font-black">{new Date(order.updated_at).toLocaleString()}</span>
                            </div>
                        </div>

                        {order.notes && (
                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Store Notes</h4>
                                <p className="text-slate-600 font-medium italic bg-amber-50 p-4 rounded-2xl border border-amber-100">"{order.notes}"</p>
                            </div>
                        )}
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
