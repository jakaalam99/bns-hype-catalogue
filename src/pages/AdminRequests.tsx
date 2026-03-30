import { useState, useEffect } from 'react';
import { useAuthStore } from '../features/auth/useAuthStore';
import { supabase } from '../lib/supabase';
import { Loader2, Search, Eye, Filter, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminRequests = () => {
    const { user } = useAuthStore();
    const role = user?.user_metadata?.role;
    const isFinance = role === 'FINANCE';
    const isMD = role === 'MD' || role === 'SUPER_ADMIN';

    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All Active');

    useEffect(() => {
        fetchRequests();
    }, [isFinance, isMD]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('requests')
                .select(`
                    id,
                    status,
                    created_at,
                    requestor_id,
                    requestor_role,
                    request_items (
                        requested_qty,
                        allocated_qty
                    )
                `)
                .order('created_at', { ascending: false });

            // Apply Role-Based Default Filtering
            if (isFinance) {
                // Finance only sees these statuses
                query = query.in('status', ['Approved', 'SJ Issued', 'Partial Fulfillment', 'Completed']);
            } else if (isMD) {
                // MD sees these by default but can search others
                // Actually MD cares most about Under Review and Adjusted
            }

            const { data, error } = await query;
            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error('Failed to fetch requests', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Draft': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'Under Review': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Adjusted': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'SJ Issued': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Partial Fulfillment': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'Completed': return 'bg-zinc-900 text-white border-zinc-900';
            case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Under Review': return <Clock size={12} className="mr-1" />;
            case 'Approved': 
            case 'Completed': return <CheckCircle2 size={12} className="mr-1" />;
            case 'Rejected': return <AlertCircle size={12} className="mr-1" />;
            default: return null;
        }
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch = req.id.toLowerCase().includes(search.toLowerCase());
        
        let matchesStatus = true;
        
        if (statusFilter === 'All Active') {
            // 'All Active' hides completed, rejected, draft
            matchesStatus = !['Draft', 'Rejected', 'Completed'].includes(req.status);
        } else if (statusFilter === 'Pending MD Action') {
            matchesStatus = ['Under Review', 'Adjusted'].includes(req.status);
        } else if (statusFilter === 'Pending Finance Action') {
            matchesStatus = ['Approved'].includes(req.status);
        } else if (statusFilter) {
            // Specific status match
            matchesStatus = req.status === statusFilter;
        } else {
            // 'All Statuses' tab (empty string) - match everything
            matchesStatus = true;
        }

        return matchesSearch && matchesStatus;
    });

    const filterOptions = isFinance 
        ? ['All Active', 'Pending Finance Action', 'SJ Issued', 'Completed', 'All Statuses']
        : ['All Active', 'Pending MD Action', 'Approved', 'Rejected', 'All Statuses'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {isFinance ? 'Shipment Processing' : 'Request Review & Allocation'}
                    </h1>
                    <p className="text-sm text-slate-500">
                        Manage and process incoming inventory requests.
                    </p>
                </div>
            </div>
            
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-96 group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search Request ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <Filter className="text-slate-400 w-4 h-4 mr-1 hidden sm:block" />
                        {filterOptions.map(opt => (
                            <button
                                key={opt}
                                onClick={() => {
                                    if (opt === 'All Statuses') setStatusFilter('');
                                    else setStatusFilter(opt);
                                }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                                    (statusFilter === opt || (opt === 'All Statuses' && statusFilter === ''))
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-premium'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
                        <p className="text-slate-500 font-medium">Loading requests...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="p-20 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                            <Search className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="font-bold text-slate-900 text-lg mb-1">No requests found</p>
                        <p className="text-slate-500">Try adjusting your filters or search query.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Request ID</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date (WIB)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Items (Req/Alloc)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Role</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRequests.map((req) => {
                                    const totalRequested = req.request_items.reduce((acc: number, item: any) => acc + item.requested_qty, 0);
                                    const totalAllocated = req.request_items.reduce((acc: number, item: any) => acc + item.allocated_qty, 0);
                                    const dateStr = new Date(req.created_at).toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });
                                    
                                    return (
                                        <tr key={req.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{req.id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-sm text-slate-600 font-medium">{dateStr}</td>
                                            <td className="px-6 py-5 text-right font-medium text-slate-700">
                                                {totalAllocated} <span className="text-slate-400 font-normal">/ {totalRequested}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-[10px] uppercase font-bold tracking-widest text-slate-600 border border-slate-200">
                                                    {req.requestor_role || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest border ${getStatusColor(req.status)}`}>
                                                    {getStatusIcon(req.status)}
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <Link
                                                    to={`/admin/requests/${req.id}`}
                                                    className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
