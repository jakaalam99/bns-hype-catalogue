import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { Loader2, Package, Clock, CheckCircle, MapPin, ChevronRight, X, FileDown, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Skeleton } from '../../components/common/Skeleton';

export const StoreOrders = () => {
    const { user } = useAuthStore();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (user) fetchOrders();
    }, [user]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('store_orders')
                .select(`
                    *,
                    items:store_order_items(id, quantity)
                `)
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const searchStr = searchTerm.toLowerCase();
            const orderId = order.id.toLowerCase();
            const status = order.status.toLowerCase();
            return orderId.includes(searchStr) || status.includes(searchStr);
        });
    }, [orders, searchTerm]);

    const calculateTotalQty = (items: any[]) => {
        return items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    };

    if (loading) {
        return (
            <div className="space-y-8 max-w-5xl pb-32">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-64" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <Skeleton className="h-12 w-full md:w-80 rounded-2xl" />
                </div>
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-premium overflow-hidden">
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-5xl font-black tracking-tight text-slate-900">My Orders</h1>
                    <p className="text-slate-500 mt-2 font-medium">Track the status of your submitted request orders.</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text"
                        placeholder="Search by ID or Status..."
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

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-premium overflow-hidden">
                <>
                    {/* Mobile Card View */}
                    <div className="block md:hidden divide-y divide-slate-100">
                        {filteredOrders.map(order => (
                            <div key={order.id} className="p-4 space-y-4 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-mono text-sm font-bold text-slate-900">#{order.id.slice(0, 8)}</h3>
                                        <p className="text-xs text-slate-500 font-medium mt-1">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className={`inline-flex px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                        order.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                        order.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                        order.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-indigo-100 text-indigo-700'
                                    }`}>
                                        {order.status}
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SKUs</span>
                                            <span className="font-black text-slate-900">{order.items?.length || 0}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Units</span>
                                            <span className="font-black text-slate-900">{calculateTotalQty(order.items)}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total</span>
                                        <span className="font-black text-indigo-600">Rp {order.total_amount?.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button 
                                        onClick={() => navigate(`/store/orders/${order.id}`)}
                                        className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Ref</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">SKU Count</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total Units</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total</th>
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
                                                onClick={() => navigate(`/store/orders/${order.id}`)}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
                {filteredOrders.length === 0 && (
                    <div className="p-20 text-center text-slate-400 italic font-medium">No orders found matching your search.</div>
                )}
            </div>
        </div>
    );
};
