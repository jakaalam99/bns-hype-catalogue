import { useState, useEffect } from 'react';
import { useAuthStore } from '../features/auth/useAuthStore';
import { hasDashboardAccess } from '../features/auth/roleUtils';
import { supabase } from '../lib/supabase';
import { Loader2, Search, Eye, Filter, Plus, Truck, Package, Clock, CheckCircle2, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Shipment, ShipmentStatus } from '../types/shipment';
import { AdminShipmentCreateModal } from '../components/admin/AdminShipmentCreateModal';
import { AdminShipmentEditModal } from '../components/admin/AdminShipmentEditModal';
import { Skeleton } from '../components/common/Skeleton';

export const AdminShipments = () => {
    const { user } = useAuthStore();
    const role = user?.user_metadata?.role?.toUpperCase() || '';
    const isMD = hasDashboardAccess(role);

    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'All'>('All');
    const [launchFilter, setLaunchFilter] = useState<'All' | 'Fully Launched' | 'Pending'>('All');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);

    useEffect(() => {
        fetchShipments();
    }, []);

    const fetchShipments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('shipments')
                .select(`
                    *,
                    items:shipment_items(sku, name, is_fully_launched)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            const processedData = (data || []).map(ship => ({
                ...ship,
                is_fully_launched: ship.items && ship.items.length > 0 && ship.items.every((i: any) => i.is_fully_launched)
            }));

            setShipments(processedData);
        } catch (err) {
            console.error('Failed to fetch shipments', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: ShipmentStatus) => {
        switch (status) {
            case 'Upcoming': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Arrived': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Received': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusIcon = (status: ShipmentStatus) => {
        switch (status) {
            case 'Upcoming': return <Clock size={12} className="mr-1" />;
            case 'Arrived': return <Truck size={12} className="mr-1" />;
            case 'Received': return <CheckCircle2 size={12} className="mr-1" />;
            default: return null;
        }
    };

    const filteredShipments = shipments.filter(ship => {
        const q = search.toLowerCase();
        const matchesSearch = ship.name?.toLowerCase().includes(q) || 
                             ship.id?.toLowerCase().includes(q) ||
                             ship.items?.some((i: any) => 
                                i.sku?.toLowerCase().includes(q) || 
                                i.name?.toLowerCase().includes(q)
                             );
        const matchesStatus = statusFilter === 'All' || ship.status === statusFilter;
        const matchesLaunch = launchFilter === 'All' || 
                             (launchFilter === 'Fully Launched' && ship.is_fully_launched) ||
                             (launchFilter === 'Pending' && !ship.is_fully_launched);
        return matchesSearch && matchesStatus && matchesLaunch;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shipment Tracking</h1>
                    <p className="text-sm text-slate-500">Monitor and manage incoming warehouse shipments.</p>
                </div>
                {isMD && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="hidden md:flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-premium"
                    >
                        <Plus size={18} />
                        New Shipment
                    </button>
                )}
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-96 group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search Shipment Name or ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <Filter className="text-slate-400 w-4 h-4 mr-1 hidden sm:block" />
                        {(['All', 'Upcoming', 'Arrived', 'Received'] as const).map(opt => (
                            <button
                                key={opt}
                                onClick={() => setStatusFilter(opt)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                                    statusFilter === opt
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-premium'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 sm:border-l sm:pl-4 border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Launch Status:</span>
                        {(['All', 'Fully Launched', 'In Progress'] as const).map(opt => (
                            <button
                                key={opt}
                                onClick={() => setLaunchFilter(opt === 'In Progress' ? 'Pending' : opt)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
                                    (launchFilter === 'Pending' && opt === 'In Progress') || launchFilter === opt
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-premium">
                        <div className="p-6 space-y-6">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex gap-4 items-center">
                                    <Skeleton className="h-12 w-12 rounded-xl" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-1/4" />
                                        <Skeleton className="h-3 w-1/3" />
                                    </div>
                                    <Skeleton className="h-8 w-24 rounded-lg hidden md:block" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : filteredShipments.length === 0 ? (
                    <div className="p-20 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                            <Truck className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="font-bold text-slate-900 text-lg mb-1">No shipments found</p>
                        <p className="text-slate-500">Try adjusting your filters or search query.</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="block md:hidden divide-y divide-slate-100">
                            {filteredShipments.map((ship) => {
                                const dateStr = new Date(ship.created_at).toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });
                                return (
                                    <div key={ship.id} className="p-4 space-y-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-slate-900 uppercase">{ship.name}</h3>
                                                <p className="text-[10px] font-mono text-slate-400 mt-1">ID: {ship.id.slice(0, 8)}...</p>
                                            </div>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[9px] uppercase font-bold tracking-widest border ${getStatusColor(ship.status)}`}>
                                                {getStatusIcon(ship.status)}
                                                {ship.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs">
                                            <div className="text-slate-500">{dateStr}</div>
                                            <div>
                                                {ship.is_fully_launched ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold uppercase tracking-wider text-[9px]">
                                                        <CheckCircle2 size={12} />
                                                        Launched
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                                                        <Clock size={12} />
                                                        Pending
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {ship.note && (
                                            <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                                                {ship.note}
                                            </p>
                                        )}

                                        <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                                            {isMD && (
                                                <button
                                                    onClick={() => setEditingShipment(ship)}
                                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 font-bold rounded-xl transition-all text-xs uppercase tracking-wider"
                                                >
                                                    <Edit2 size={14} />
                                                    Edit
                                                </button>
                                            )}
                                            <Link
                                                to={`/admin/shipments/${ship.id}`}
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-xl transition-all shadow-sm text-xs uppercase tracking-wider"
                                            >
                                                <Eye size={14} />
                                                View
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Shipment</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Note</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Launch</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredShipments.map((ship) => {
                                        const dateStr = new Date(ship.created_at).toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });
                                        return (
                                            <tr key={ship.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">{ship.name}</span>
                                                        <span className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {ship.id.slice(0, 8)}...</span>
                                                        <span className="text-[10px] text-slate-400 mt-0.5">{dateStr}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <p className="text-sm text-slate-600 font-medium max-w-[200px] truncate" title={ship.note || ''}>
                                                        {ship.note || '-'}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-5">
                                                    {ship.is_fully_launched ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                            <CheckCircle2 size={12} />
                                                            Fully Launched
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100">
                                                            <Clock size={12} />
                                                            In Progress
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest border ${getStatusColor(ship.status)}`}>
                                                        {getStatusIcon(ship.status)}
                                                        {ship.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {isMD && (
                                                                <button
                                                                    onClick={() => setEditingShipment(ship)}
                                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                    title="Edit Shipment Info"
                                                                >
                                                                    <Edit2 size={18} />
                                                                </button>
                                                        )}
                                                        <Link
                                                            to={`/admin/shipments/${ship.id}`}
                                                            className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-5 h-5" />
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <AdminShipmentCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchShipments}
            />

            <AdminShipmentEditModal
                isOpen={!!editingShipment}
                onClose={() => setEditingShipment(null)}
                onSuccess={fetchShipments}
                shipment={editingShipment}
            />

            {/* Floating Action Button (Mobile) */}
            {isMD && (
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="md:hidden fixed bottom-24 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-premium hover:bg-indigo-700 hover:scale-105 transition-all z-40"
                >
                    <Plus size={24} />
                </button>
            )}
        </div>
    );
};
