import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, ShoppingBag, Clock, CheckCircle, XCircle, ChevronRight, Package, User, MapPin, FileDown, Search, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export const AdminOrderManagement = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setError(null);
            const { data, error: fetchError } = await supabase
                .from('store_orders')
                .select(`
                    *,
                    store:destination_locations(name),
                    items:store_order_items(id, quantity)
                `)
                .order('created_at', { ascending: false });
            
            if (fetchError) throw fetchError;
            setOrders(data || []);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const searchStr = searchTerm.toLowerCase();
            const storeName = (order.store?.name || '').toLowerCase();
            const orderId = order.id.toLowerCase();
            return storeName.includes(searchStr) || orderId.includes(searchStr);
        });
    }, [orders, searchTerm]);

    const calculateTotalQty = (items: any[]) => {
        return items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Loading Order System...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        <ShoppingBag size={40} className="text-indigo-600" />
                        Store Orders
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Review and manage request orders submitted by physical stores.</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text"
                        placeholder="Search by store or Order ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-premium transition-all"
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-3 animate-shake">
                    <XCircle size={20} />
                    {error}
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-premium overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Order Ref</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Store</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">SKU Count</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total Units</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total Amount</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <span className="font-mono text-xs font-bold text-slate-400">#{order.id.slice(0, 8)}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <MapPin size={14} />
                                            </div>
                                            <span className="font-bold text-slate-900">{order.store?.name || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm text-slate-500 font-medium">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-8 py-6 text-right font-black text-slate-900">
                                        {order.items?.length || 0}
                                    </td>
                                    <td className="px-8 py-6 text-right font-black text-slate-900">
                                        {calculateTotalQty(order.items)}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <span className="font-black text-indigo-600">Rp {order.total_amount?.toLocaleString()}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            order.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                            order.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                            order.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-indigo-100 text-indigo-700'
                                        }`}>
                                            {order.status}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <button 
                                            onClick={() => navigate(`/admin/orders/${order.id}`)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200"
                                        >
                                            Details
                                            <ChevronRight size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredOrders.length === 0 && (
                    <div className="p-20 text-center text-slate-400 italic">No orders found matching your search.</div>
                )}
            </div>
        </div>
    );
};
