import { useState, useEffect } from 'react';
import React from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../features/auth/useAuthStore';
import { Loader2, Package, Search, ChevronDown, ChevronUp, FileText } from 'lucide-react';

export const RequestStatusPage = () => {
    const { user } = useAuthStore();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!user) return;
        const fetchRequests = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('requests')
                    .select(`
                        id,
                        status,
                        created_at,
                        request_items (
                            id,
                            sku,
                            product_name,
                            requested_qty,
                            allocated_qty,
                            destination_location
                        ),
                        surat_jalan (
                            id,
                            sj_number,
                            pdf_url
                        )
                    `)
                    .eq('requestor_id', user.id)
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                setRequests(data || []);
            } catch (err) {
                console.error("Failed to fetch requests", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [user]);

    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Draft': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'Under Review': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'Adjusted': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'SJ Issued': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Partial Fulfillment': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'Completed': return 'bg-zinc-900 text-white border-zinc-900';
            case 'Rejected': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const filteredRequests = requests.filter(r => r.id.toLowerCase().includes(search.toLowerCase()));

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                <p className="text-slate-500 font-medium tracking-wide">Loading your requests...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-display font-black text-slate-900 mb-2 uppercase tracking-tight">Request <span className="text-indigo-600">History</span></h1>
                    <p className="text-slate-500 font-medium">Track your inventory requests and download Surat Jalan.</p>
                </div>
                
                <div className="relative w-full md:w-80">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search Request ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Request ID</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Date (WIB)</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Total Items</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center text-slate-500">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                            <Package size={24} className="text-slate-400" />
                                        </div>
                                        <p className="font-bold text-slate-700">No requests found</p>
                                        <p className="text-sm">You haven't submitted any inventory requests yet.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((req) => {
                                    const totalRequested = req.request_items.reduce((acc: number, item: any) => acc + item.requested_qty, 0);
                                    const totalAllocated = req.request_items.reduce((acc: number, item: any) => acc + item.allocated_qty, 0);
                                    const dateStr = new Date(req.created_at).toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });
                                    const isExpanded = expandedRows.has(req.id);
                                    const hasSJ = req.surat_jalan && req.surat_jalan.length > 0;

                                    return (
                                        <React.Fragment key={req.id}>
                                            <tr className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <span className="font-mono font-bold text-slate-900">{req.id}</span>
                                                </td>
                                                <td className="px-6 py-5 text-slate-600 text-sm">
                                                    {dateStr}
                                                </td>
                                                <td className="px-6 py-5 text-sm font-medium text-slate-700">
                                                    {totalAllocated} <span className="text-slate-400 font-normal">/ {totalRequested} req</span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${getStatusColor(req.status)}`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {hasSJ && (
                                                            <button 
                                                                onClick={() => window.open(req.surat_jalan[0]?.pdf_url, '_blank')}
                                                                className="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                                                            >
                                                                <FileText size={14} /> Download SJ
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => toggleRow(req.id)}
                                                            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors"
                                                        >
                                                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={5} className="bg-slate-50 p-6 border-b border-slate-200">
                                                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                                            <table className="w-full text-left text-sm">
                                                                <thead>
                                                                    <tr className="bg-slate-100/50">
                                                                        <th className="px-4 py-3 font-bold text-slate-700">SKU / Item</th>
                                                                        <th className="px-4 py-3 font-bold text-slate-700">Destination</th>
                                                                        <th className="px-4 py-3 font-bold text-slate-700 text-right">Req. Qty</th>
                                                                        <th className="px-4 py-3 font-bold text-slate-700 text-right">Allocated Qty</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {req.request_items.map((item: any) => (
                                                                        <tr key={item.id}>
                                                                            <td className="px-4 py-3">
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-bold text-slate-900">{item.product_name}</span>
                                                                                    <span className="font-mono text-xs text-slate-500">{item.sku}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-slate-600">
                                                                                {item.destination_location}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right font-medium text-slate-500">
                                                                                {item.requested_qty}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right">
                                                                                <span className={`font-bold ${item.allocated_qty < item.requested_qty ? 'text-orange-500' : 'text-emerald-600'}`}>
                                                                                    {item.allocated_qty}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
