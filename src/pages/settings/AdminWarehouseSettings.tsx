import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Loader2, Save, Store, Plus, Trash2, Edit2, Check, X, 
    Layers, Filter, Search, ChevronDown, ChevronRight,
    Eye, EyeOff, MinusCircle
} from 'lucide-react';
import type { Warehouse, WarehouseGroup } from '../../types/warehouse';

// --- Selector Modal Component ---
interface SelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (warehouseIds: string[]) => void;
    warehouses: Warehouse[];
    groupName: string;
}

const WarehouseSelectorModal = ({ isOpen, onClose, onAdd, warehouses, groupName }: SelectorModalProps) => {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [unassignedOnly, setUnassignedOnly] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setSelectedIds(new Set());
            setUnassignedOnly(false);
        }
    }, [isOpen]);

    const filtered = warehouses.filter(w => {
        const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase());
        const matchesUnassigned = !unassignedOnly || !w.group_id;
        return matchesSearch && matchesUnassigned;
    });

    const toggleId = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-900">Add to {groupName}</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Select warehouses to add to this group</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 border-b border-slate-100 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by warehouse name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    {filtered.length > 0 && (
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => {
                                    const next = new Set(selectedIds);
                                    filtered.forEach(w => next.add(w.id));
                                    setSelectedIds(next);
                                }}
                                className="text-[10px] font-black uppercase text-indigo-600 hover:underline tracking-widest flex items-center gap-1"
                            >
                                <Check size={12} /> Select All {filtered.length} Results
                            </button>
                            <div className="h-4 w-px bg-slate-200" />
                            <button 
                                onClick={() => setUnassignedOnly(!unassignedOnly)}
                                className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${
                                    unassignedOnly ? 'text-orange-600 font-black' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <Filter size={12} /> {unassignedOnly ? 'Showing Unassigned Only' : 'Show Unassigned Only'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filtered.map(w => (
                        <label 
                            key={w.id} 
                            className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${
                                selectedIds.has(w.id) ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(w.id)}
                                    onChange={() => toggleId(w.id)}
                                    className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="font-bold text-slate-700">{w.name}</span>
                            </div>
                            {w.group_id && (
                                <span className="text-[10px] font-black bg-slate-200 text-slate-500 px-2 py-1 rounded-md uppercase">
                                    Already in a group
                                </span>
                            )}
                        </label>
                    ))}
                    {filtered.length === 0 && (
                        <div className="text-center py-12 text-slate-400 font-bold italic">No warehouses found.</div>
                    )}
                </div>

                <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-900 transition-colors">
                        Cancel
                    </button>
                    <button
                        disabled={selectedIds.size === 0}
                        onClick={() => onAdd(Array.from(selectedIds))}
                        className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-premium"
                    >
                        Add Selected ({selectedIds.size})
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main Component ---
export const AdminWarehouseSettings = () => {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [groups, setGroups] = useState<WarehouseGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // UI State
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['NoGroup']));
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [targetGroupId, setTargetGroupId] = useState<string | null>(null);

    // Group Edit State
    const [newGroupName, setNewGroupName] = useState('');
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editGroupName, setEditGroupName] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: gData, error: gError } = await supabase.from('warehouse_groups').select('*').order('name');
            if (gError) throw gError;
            setGroups(gData || []);

            const { data: wData, error: wError } = await supabase.from('warehouses').select('*').order('name');
            if (wError) throw wError;
            setWarehouses(wData as Warehouse[]);
        } catch (err: any) {
            console.error('Error:', err);
            setError('Failed to load data.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            const { error: wUpdateError } = await supabase
                .from('warehouses')
                .upsert(warehouses.map(w => ({ 
                    id: w.id, 
                    name: w.name, 
                    is_visible: w.is_visible,
                    group_id: w.group_id 
                })));
            if (wUpdateError) throw wUpdateError;
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError('Failed to save settings: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleGroup = (id: string) => {
        const next = new Set(expandedGroups);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedGroups(next);
    };

    const handleAddGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        try {
            const { data, error } = await supabase.from('warehouse_groups').insert([{ name: newGroupName.trim() }]).select();
            if (error) throw error;
            setGroups([...groups, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
            setNewGroupName('');
        } catch (err: any) {
            alert('Failed to add group: ' + err.message);
        }
    };

    const handleDeleteGroup = async (id: string, name: string) => {
        if (!confirm(`Delete group "${name}"? Warehouses will be moved to "No Group".`)) return;
        try {
            await supabase.from('warehouse_groups').delete().eq('id', id);
            setGroups(groups.filter(g => g.id !== id));
            setWarehouses(warehouses.map(w => w.group_id === id ? { ...w, group_id: null } : w));
        } catch (err: any) {
            alert('Error deleting group: ' + err.message);
        }
    };

    const removeFromGroup = (warehouseId: string) => {
        setWarehouses(warehouses.map(w => w.id === warehouseId ? { ...w, group_id: null } : w));
    };

    const addToGroup = (warehouseIds: string[]) => {
        if (!targetGroupId) return;
        setWarehouses(warehouses.map(w => 
            warehouseIds.includes(w.id) ? { ...w, group_id: targetGroupId } : w
        ));
        setIsSelectorOpen(false);
        setTargetGroupId(null);
    };

    const toggleGroupVisibility = (groupId: string | null, visible: boolean) => {
        setWarehouses(warehouses.map(w => {
            const match = groupId === null ? !w.group_id : w.group_id === groupId;
            return match ? { ...w, is_visible: visible } : w;
        }));
    };

    const getGroupWarehouses = (groupId: string | null) => {
        return warehouses.filter(w => w.group_id === groupId || (groupId === null && !w.group_id));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 animate-pulse">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Initializing Secure Environment...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 max-w-5xl pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Warehouse Visibility</h1>
                    <p className="text-slate-500 mt-2 font-medium">Categorize warehouses into groups and control their visibility across the system.</p>
                </div>
                <form onSubmit={handleAddGroup} className="flex gap-2 w-full md:w-auto">
                    <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Create new group name..."
                        className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none min-w-[240px] shadow-sm"
                    />
                    <button type="submit" disabled={!newGroupName.trim()} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-black text-sm flex items-center gap-2 shadow-premium disabled:opacity-50">
                        <Plus size={18} /> Create
                    </button>
                </form>
            </div>

            <div className="space-y-4">
                {/* Groups List */}
                {groups.map(group => {
                    const groupWarehouses = getGroupWarehouses(group.id);
                    const isExpanded = expandedGroups.has(group.id);
                    const allVisible = groupWarehouses.length > 0 && groupWarehouses.every(w => w.is_visible);

                    return (
                        <div key={group.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
                            {/* Group Header */}
                            <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => toggleGroup(group.id)}>
                                    <div className={`p-3 rounded-2xl transition-colors ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                        <Layers size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                                            {group.name}
                                            {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                                        </h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{groupWarehouses.length} Warehouses</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => toggleGroupVisibility(group.id, !allVisible)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                            allVisible ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400 hover:text-indigo-600'
                                        }`}
                                    >
                                        {allVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                        {allVisible ? 'All Visible' : 'Mark All Visible'}
                                    </button>
                                    <div className="h-6 w-px bg-slate-100 mx-1" />
                                    <button onClick={() => handleDeleteGroup(group.id, group.name)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Group Content (Expandable) */}
                            {isExpanded && (
                                <div className="px-6 pb-6 animate-slide-down">
                                    <div className="pt-4 border-t border-slate-50">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {groupWarehouses.map(w => (
                                                <div key={w.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl group/item">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-2 h-2 rounded-full ${w.is_visible ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                        <span className="text-sm font-bold text-slate-700 truncate">{w.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => {
                                                                setWarehouses(warehouses.map(wh => wh.id === w.id ? { ...wh, is_visible: !wh.is_visible } : wh));
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-indigo-600"
                                                        >
                                                            {w.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                                        </button>
                                                        <button onClick={() => removeFromGroup(w.id)} className="p-1 text-slate-400 hover:text-red-500">
                                                            <MinusCircle size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => {
                                                    setTargetGroupId(group.id);
                                                    setIsSelectorOpen(true);
                                                }}
                                                className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all text-sm font-bold"
                                            >
                                                <Plus size={16} /> Add Warehouse
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* No Group Section */}
                <div className="bg-slate-50 rounded-[2rem] border border-slate-200 border-dashed overflow-hidden">
                    <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => toggleGroup('NoGroup')}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${expandedGroups.has('NoGroup') ? 'bg-slate-700 text-white' : 'bg-white text-slate-300'}`}>
                                <Store size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-700 text-lg">Unassigned Warehouses</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{getGroupWarehouses(null).length} Warehouses</p>
                            </div>
                        </div>
                    </div>
                    {expandedGroups.has('NoGroup') && (
                        <div className="px-6 pb-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {getGroupWarehouses(null).map(w => (
                                    <div key={w.id} className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                                        <span className="text-sm font-bold text-slate-600">{w.name}</span>
                                        <button 
                                            onClick={() => {
                                                setWarehouses(warehouses.map(wh => wh.id === w.id ? { ...wh, is_visible: !wh.is_visible } : wh));
                                            }}
                                            className="p-1 text-slate-400 hover:text-indigo-600"
                                        >
                                            {w.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-40">
                {success && (
                    <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-2xl flex items-center gap-2 animate-bounce">
                        <Check size={18} /> Settings Saved
                    </div>
                )}
                {error && (
                    <div className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-2xl animate-shake">
                        {error}
                    </div>
                )}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-3 px-12 py-5 bg-slate-900 text-white font-black rounded-[2rem] hover:bg-indigo-600 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.3)] disabled:opacity-50"
                >
                    {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                    <span className="text-lg">Save Configuration</span>
                </button>
            </div>

            {/* Selector Modal */}
            <WarehouseSelectorModal
                isOpen={isSelectorOpen}
                onClose={() => setIsSelectorOpen(false)}
                onAdd={addToGroup}
                warehouses={warehouses}
                groupName={groups.find(g => g.id === targetGroupId)?.name || ''}
            />
        </div>
    );
};
