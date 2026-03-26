import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/useAuthStore';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Loader2, CheckCircle2, FileText, Check, X, ShieldAlert, FileOutput } from 'lucide-react';

export const AdminRequestDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const role = user?.user_metadata?.role;
    const isMD = role === 'MD' || role === 'SUPER_ADMIN';
    const isFinance = role === 'FINANCE';

    const [request, setRequest] = useState<any>(null);
    const [requestorEmail, setRequestorEmail] = useState<string>('Unknown User');
    const [items, setItems] = useState<any[]>([]);
    const [allocations, setAllocations] = useState<any[]>([]);
    const [sj, setSj] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [adjustments, setAdjustments] = useState<Record<string, number>>({});
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchRequestData();
    }, [id]);

    const fetchRequestData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            // Fetch Request
            const { data: reqData, error: reqErr } = await supabase
                .from('requests')
                .select('*')
                .eq('id', id)
                .single();
            if (reqErr) throw reqErr;
            setRequest(reqData);

            // Fetch Requestor profile manually if possible (by ID)
            const { data: profData } = await supabase
                .from('profiles')
                .select('email, role')
                .eq('id', reqData.requestor_id)
                .single();
            if (profData) {
                setRequestorEmail(`${profData.email} (${profData.role})`);
            } else {
                 setRequestorEmail(reqData.requestor_role);
            }

            // Fetch Items
            const { data: itemsData, error: itemsErr } = await supabase
                .from('request_items')
                .select('*')
                .eq('request_id', id);
            if (itemsErr) throw itemsErr;
            setItems(itemsData || []);

            // Initialize adjustments to current allocated_qty
            const initialAdjs: Record<string, number> = {};
            (itemsData || []).forEach(item => {
                initialAdjs[item.id] = item.allocated_qty;
            });
            setAdjustments(initialAdjs);

            // Fetch Allocations for these items
            const itemIds = (itemsData || []).map(i => i.id);
            if (itemIds.length > 0) {
                const { data: allocData } = await supabase
                    .from('allocations')
                    .select('*, warehouses(name)')
                    .in('request_item_id', itemIds);
                setAllocations(allocData || []);
            }
            
            // Fetch SJ if any
            const { data: sjData } = await supabase.from('surat_jalan').select('*').eq('request_id', id);
            setSj(sjData || []);

        } catch (err) {
            console.error('Error fetching request detail:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdjustmentChange = (itemId: string, val: string, max: number) => {
        let n = parseInt(val, 10);
        if (isNaN(n)) n = 0;
        if (n < 0) n = 0;
        if (n > max) n = max;

        setAdjustments(prev => ({
            ...prev,
            [itemId]: n
        }));
    };

    const processMDAction = async (action: 'APPROVE' | 'REJECT') => {
        if (!id) return;
        setIsProcessing(true);
        try {
            const updates = items
                .filter(item => adjustments[item.id] !== item.allocated_qty)
                .map(item => ({ item_id: item.id, new_allocated_qty: adjustments[item.id] }));

            const { error } = await supabase.rpc('md_process_request', {
                p_request_id: id,
                p_action: action,
                p_adjustments: updates.length > 0 ? updates : []
            });

            if (error) throw error;
            
            // Refetch to see updated statuses and refunded allocations
            await fetchRequestData();
            
            if (action === 'REJECT') {
                navigate('/admin/requests');
            }
            
        } catch (err: any) {
            alert(`Error processing request: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const generateSJ = async () => {
        if (!id) return;
        setIsProcessing(true);
        try {
            // Generate mock SJ number
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randomDoc = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
            const sjNumber = `SJ/${dateStr}/${randomDoc}`;

            // Insert into surat_jalan
            const { error: sjErr } = await supabase.from('surat_jalan').insert([{
                request_id: id,
                sj_number: sjNumber
            }]);
            if (sjErr) throw sjErr;

            // Update status to SJ Issued
            const { error: updErr } = await supabase.from('requests').update({ status: 'SJ Issued' }).eq('id', id);
            if (updErr) throw updErr;

            await fetchRequestData();
        } catch (err: any) {
            alert(`Error generating SJ: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const markCompleted = async () => {
        if (!id) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('requests').update({ status: 'Completed' }).eq('id', id);
            if (error) throw error;
            await fetchRequestData();
        } catch (err: any) {
             alert(`Error marking completed: ${err.message}`);
        } finally {
             setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading request payload...</p>
            </div>
        );
    }

    if (!request) {
        return (
            <div className="text-center p-20">
                <h2 className="text-2xl font-bold text-slate-800">Request Not Found</h2>
                <Link to="/admin/requests" className="text-indigo-600 hover:underline mt-4 inline-block">Return to list</Link>
            </div>
        );
    }

    const isPendingMD = ['Under Review', 'Adjusted'].includes(request.status);
    const canMDApprove = isMD && isPendingMD;
    
    // Finance allowed actions
    const canFinanceSJ = isFinance && request.status === 'Approved';
    const canFinanceComplete = isFinance && ['SJ Issued', 'Partial Fulfillment'].includes(request.status);

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

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex items-center gap-4">
                <Link to="/admin/requests" className="p-2 bg-white rounded-full shadow-sm hover:shadow border border-slate-200 text-slate-500 hover:text-indigo-600 transition-all">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase font-mono">{request.id}</h1>
                        <span className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest border ${getStatusColor(request.status)}`}>
                            {request.status}
                        </span>
                    </div>
                    <p className="text-slate-500 mt-1">Requestor: <span className="font-semibold text-slate-700">{requestorEmail}</span> &middot; Created: {new Date(request.created_at).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} WIB</p>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 md:p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <FileText className="text-indigo-600" /> Payload Details
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">Item (SKU)</th>
                                    <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">Destination</th>
                                    <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Requested</th>
                                    <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-widest text-right">System Alloc</th>
                                    <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">Sources</th>
                                    <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Final Alloc</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-4">
                                            <p className="font-bold text-slate-900">{item.product_name}</p>
                                            <p className="font-mono text-xs text-slate-500">{item.sku}</p>
                                        </td>
                                        <td className="px-4 py-4 text-slate-600 text-sm">
                                            {item.destination_location}
                                        </td>
                                        <td className="px-4 py-4 text-right font-medium text-slate-600">
                                            {item.requested_qty}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className={`font-medium ${item.allocated_qty < item.requested_qty ? 'text-orange-500' : 'text-emerald-600'}`}>
                                                {item.allocated_qty}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {allocations.filter(a => a.request_item_id === item.id).map(a => (
                                                    <span key={a.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                                                        {a.warehouses?.name}: {a.qty}
                                                    </span>
                                                ))}
                                                {allocations.filter(a => a.request_item_id === item.id).length === 0 && (
                                                    <span className="text-xs text-slate-400 italic">No sources</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right flex justify-end">
                                            {canMDApprove ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.allocated_qty}
                                                    value={adjustments[item.id] !== undefined ? adjustments[item.id] : item.allocated_qty}
                                                    onChange={(e) => handleAdjustmentChange(item.id, e.target.value, item.allocated_qty)}
                                                    className={`w-20 text-center py-1.5 px-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold ${
                                                        adjustments[item.id] !== item.allocated_qty ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200'
                                                    }`}
                                                />
                                            ) : (
                                                <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-md">
                                                    {item.allocated_qty}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* SJ Display */}
            {sj.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="font-black tracking-widest text-blue-800 uppercase text-xs mb-1 flex items-center gap-1">
                            <FileOutput size={14} /> Surat Jalan Issued
                        </h3>
                        <p className="font-mono text-xl font-bold text-blue-900">{sj[0].sj_number}</p>
                        <p className="text-xs text-blue-600/80 mt-1">Generated: {new Date(sj[0].created_at).toLocaleString()}</p>
                    </div>
                </div>
            )}

            {/* Action Bar */}
            {(canMDApprove || canFinanceSJ || canFinanceComplete) && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-end gap-3 sticky bottom-4 z-10">
                    
                    {canMDApprove && (
                        <>
                            <p className="mr-auto self-center text-sm font-medium text-slate-500 hidden md:block px-4">
                                <ShieldAlert className="inline w-4 h-4 mr-1 text-slate-400" />
                                Adjustments will permanently refund stock to warehouses.
                            </p>
                            <button
                                onClick={() => processMDAction('REJECT')}
                                disabled={isProcessing}
                                className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition flex items-center gap-2"
                            >
                                <X size={18} /> Reject
                            </button>
                            <button
                                onClick={() => processMDAction('APPROVE')}
                                disabled={isProcessing}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-2"
                            >
                                <Check size={18} /> Approve Allocations
                            </button>
                        </>
                    )}

                    {canFinanceSJ && (
                        <button
                            onClick={generateSJ}
                            disabled={isProcessing}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-2"
                        >
                            <FileText size={18} /> Generate SJ
                        </button>
                    )}

                    {canFinanceComplete && (
                        <button
                            onClick={markCompleted}
                            disabled={isProcessing}
                            className="px-6 py-3 bg-zinc-900 hover:bg-black text-white font-bold rounded-xl shadow-premium transition flex items-center gap-2"
                        >
                            <CheckCircle2 size={18} /> Mark as Completed
                        </button>
                    )}
                </div>
            )}

        </div>
    );
};
