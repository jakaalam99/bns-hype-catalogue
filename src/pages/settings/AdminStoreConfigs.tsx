import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Save, MapPin, Layers, User, Check, AlertCircle } from 'lucide-react';

interface StoreUser {
    id: string;
    email: string;
    role: string;
    store_name?: string;
    store_id?: string | null;
}

interface Destination {
    id: string;
    name: string;
    user_id?: string;
}

interface WarehouseGroup {
    id: string;
    name: string;
}

interface StoreConfig {
    store_id: string;
    allowed_warehouse_group_ids: string[];
}

export const AdminStoreConfigs = () => {
    const [storeUsers, setStoreUsers] = useState<StoreUser[]>([]);
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [warehouseGroups, setWarehouseGroups] = useState<WarehouseGroup[]>([]);
    const [configs, setConfigs] = useState<StoreConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [wgRes, dRes, cRes, pRes] = await Promise.all([
                supabase.from('warehouse_groups').select('id, name').order('name'),
                supabase.from('destination_locations').select('id, name').order('name'),
                supabase.from('store_warehouse_configs').select('*'),
                supabase.from('profiles').select('id, email, role, store_id').order('email')
            ]);

            setWarehouseGroups(wgRes.data || []);
            setDestinations(dRes.data || []);
            setConfigs(cRes.data || []);
            setStoreUsers(pRes.data || []);
            
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignUser = async (userId: string, storeId: string | null) => {
        setStoreUsers(prev => prev.map(u => u.id === userId ? { ...u, store_id: storeId } : u));
    };

    const handleToggleGroup = (storeId: string, groupId: string) => {
        const currentConfig = configs.find(c => c.store_id === storeId) || { store_id: storeId, allowed_warehouse_group_ids: [] };
        const ids = currentConfig.allowed_warehouse_group_ids;
        
        const newIds = ids.includes(groupId) 
            ? ids.filter(id => id !== groupId)
            : [...ids, groupId];
            
        setConfigs(prev => {
            const filtered = prev.filter(c => c.store_id !== storeId);
            return [...filtered, { ...currentConfig, allowed_warehouse_group_ids: newIds }];
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Update Warehouse Group Configs
            const configPromise = supabase
                .from('store_warehouse_configs')
                .upsert(configs.map(c => ({
                    store_id: c.store_id,
                    allowed_warehouse_group_ids: c.allowed_warehouse_group_ids
                })), { onConflict: 'store_id' });

            // 2. Update Profiles (Store IDs)
            const profilePromises = storeUsers.map(u => 
                supabase.from('profiles').update({ store_id: u.store_id }).eq('id', u.id)
            );

            const results = await Promise.all([configPromise, ...profilePromises]);
            const errors = results.filter(r => r.error);
            
            if (errors.length > 0) throw new Error(errors.map(e => e.error?.message).join(', '));
            
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            alert('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 animate-pulse">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Syncing User Profiles...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 max-w-5xl pb-32">
            <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900">Store Configurations</h1>
                <p className="text-slate-500 mt-2 font-medium">Link store accounts and configure warehouse visibility.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {destinations.map(dest => {
                    const config = configs.find(c => c.store_id === dest.id) || { store_id: dest.id, allowed_warehouse_group_ids: [] };
                    const linkedUsers = storeUsers.filter(u => u.store_id === dest.id);
                    const availableUsers = storeUsers.filter(u => !u.store_id && u.role?.toUpperCase() === 'STORE');

                    return (
                        <div key={dest.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-8 flex flex-col md:flex-row gap-8 items-start">
                            <div className="md:w-1/3 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[1.5rem]">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-xl">{dest.name}</h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Store Location</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                                        <User size={14} /> Linked Accounts
                                    </h4>
                                    <div className="space-y-2">
                                        {linkedUsers.map(user => (
                                            <div key={user.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group">
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-bold text-slate-700 truncate">{user.email}</p>
                                                    <p className="text-[9px] font-mono text-slate-400 truncate">{user.id}</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleAssignUser(user.id, null)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {linkedUsers.length === 0 && (
                                            <p className="text-xs text-slate-400 italic">No accounts linked yet.</p>
                                        )}
                                    </div>

                                    {availableUsers.length > 0 && (
                                        <div className="pt-2">
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) handleAssignUser(e.target.value, dest.id);
                                                }}
                                                value=""
                                                className="w-full bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            >
                                                <option value="">+ Add Store Account</option>
                                                {availableUsers.map(u => (
                                                    <option key={u.id} value={u.id}>{u.email}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Layers size={16} /> Allowed Warehouse Groups
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {warehouseGroups.map(group => {
                                        const isChecked = config.allowed_warehouse_group_ids.includes(group.id);
                                        return (
                                            <button
                                                key={group.id}
                                                onClick={() => handleToggleGroup(dest.id, group.id)}
                                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                                    isChecked 
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/10' 
                                                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                                }`}
                                            >
                                                <span className="font-bold text-sm">{group.name}</span>
                                                {isChecked ? <Check size={18} /> : <div className="w-[18px]" />}
                                            </button>
                                        );
                                    })}
                                </div>
                                {warehouseGroups.length === 0 && (
                                    <div className="flex items-center gap-2 text-slate-400 italic text-sm py-4">
                                        <AlertCircle size={16} /> No warehouse groups found. Please create them first.
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-3 px-12 py-5 bg-slate-900 text-white font-black rounded-[2.5rem] hover:bg-indigo-600 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.3)] disabled:opacity-50"
                >
                    {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                    <span className="text-lg">{saving ? 'Saving...' : 'Save Configuration'}</span>
                </button>
                {success && (
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-2xl flex items-center gap-2 animate-bounce whitespace-nowrap">
                        <Check size={18} /> Configuration Updated!
                    </div>
                )}
            </div>
        </div>
    );
};
