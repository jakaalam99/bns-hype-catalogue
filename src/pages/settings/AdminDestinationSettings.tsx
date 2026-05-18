import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Loader2, Plus, Trash2, Truck, Edit2, Check, X, 
    Layers, Filter, Search, ChevronDown, ChevronRight,
    MapPin, MinusCircle
} from 'lucide-react';

// --- Selector Modal Component ---
interface SelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (locationIds: string[]) => void;
    locations: any[];
    groupName: string;
}

const DestinationSelectorModal = ({ isOpen, onClose, onAdd, locations, groupName }: SelectorModalProps) => {
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

    const filtered = locations.filter(l => {
        const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase());
        const matchesUnassigned = !unassignedOnly || !l.group_id;
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
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Select destinations to add to this group</p>
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
                            placeholder="Search by destination name..."
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
                                    filtered.forEach(l => next.add(l.id));
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
                    {filtered.map(l => (
                        <label 
                            key={l.id} 
                            className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${
                                selectedIds.has(l.id) ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(l.id)}
                                    onChange={() => toggleId(l.id)}
                                    className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="font-bold text-slate-700">{l.name}</span>
                            </div>
                            {l.group_id && (
                                <span className="text-[10px] font-black bg-slate-200 text-slate-500 px-2 py-1 rounded-md uppercase">
                                    Assigned
                                </span>
                            )}
                        </label>
                    ))}
                    {filtered.length === 0 && (
                        <div className="text-center py-12 text-slate-400 font-bold italic">No destinations found.</div>
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
export const AdminDestinationSettings = () => {
    const [locations, setLocations] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['NoGroup']));
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [targetGroupId, setTargetGroupId] = useState<string | null>(null);

    // New Entity State
    const [newGroupName, setNewGroupName] = useState('');
    const [newLocationName, setNewLocationName] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: gData, error: gError } = await supabase.from('destination_groups').select('*').order('name');
            if (gError) throw gError;
            setGroups(gData || []);

            const { data: lData, error: lError } = await supabase.from('destination_locations').select('*').order('name');
            if (lError) throw lError;
            setLocations(lData || []);
        } catch (err: any) {
            console.error('Error:', err);
            setError('Failed to load data.');
        } finally {
            setLoading(false);
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
            const { data, error } = await supabase.from('destination_groups').insert([{ name: newGroupName.trim() }]).select();
            if (error) throw error;
            setGroups([...groups, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
            setNewGroupName('');
        } catch (err: any) {
            alert('Failed to add group: ' + err.message);
        }
    };

    const handleAddLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLocationName.trim()) return;
        try {
            const { data, error } = await supabase.from('destination_locations').insert([{ name: newLocationName.trim() }]).select();
            if (error) throw error;
            setLocations([...locations, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
            setNewLocationName('');
            setExpandedGroups(new Set([...expandedGroups, 'NoGroup']));
        } catch (err: any) {
            alert('Failed to add destination: ' + err.message);
        }
    };

    const handleDeleteGroup = async (id: string, name: string) => {
        if (!confirm(`Delete group "${name}"? Destinations will be moved to "No Group".`)) return;
        try {
            await supabase.from('destination_groups').delete().eq('id', id);
            setGroups(groups.filter(g => g.id !== id));
            setLocations(locations.map(l => l.group_id === id ? { ...l, group_id: null } : l));
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleDeleteLocation = async (id: string) => {
        if (!confirm(`Are you sure you want to delete this destination?`)) return;
        try {
            await supabase.from('destination_locations').delete().eq('id', id);
            setLocations(locations.filter(l => l.id !== id));
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const updateGroupAssignment = async (locationIds: string[], groupId: string | null) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('destination_locations')
                .update({ group_id: groupId })
                .in('id', locationIds);
            if (error) throw error;
            setLocations(locations.map(l => 
                locationIds.includes(l.id) ? { ...l, group_id: groupId } : l
            ));
            setIsSelectorOpen(false);
            setTargetGroupId(null);
        } catch (err: any) {
            alert('Failed to update: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const getGroupLocations = (groupId: string | null) => {
        return locations.filter(l => l.group_id === groupId || (groupId === null && !l.group_id));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Loading Destination System...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 max-w-5xl pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Destination Groups</h1>
                    <p className="text-slate-500 mt-2 font-medium">Organize stores and shipping destinations into manageable groups.</p>
                </div>
                <div className="flex flex-col gap-3 w-full md:w-auto">
                    <form onSubmit={handleAddGroup} className="flex gap-2">
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="New group name..."
                            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none flex-1 shadow-sm"
                        />
                        <button type="submit" disabled={!newGroupName.trim()} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-black text-sm flex items-center gap-2 shadow-premium disabled:opacity-50">
                            <Plus size={18} /> Group
                        </button>
                    </form>
                    <form onSubmit={handleAddLocation} className="flex gap-2">
                        <input
                            type="text"
                            value={newLocationName}
                            onChange={(e) => setNewLocationName(e.target.value)}
                            placeholder="Add new destination..."
                            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none flex-1 shadow-sm"
                        />
                        <button type="submit" disabled={!newLocationName.trim()} className="px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-700 font-black text-sm flex items-center gap-2 shadow-premium disabled:opacity-50">
                            <Truck size={18} /> Add
                        </button>
                    </form>
                </div>
            </div>

            <div className="space-y-4">
                {groups.map(group => {
                    const groupLocs = getGroupLocations(group.id);
                    const isExpanded = expandedGroups.has(group.id);

                    return (
                        <div key={group.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden transition-all">
                            <div className="p-6 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => toggleGroup(group.id)}>
                                    <div className={`p-3 rounded-2xl ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                        <Layers size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                                            {group.name}
                                            {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                                        </h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{groupLocs.length} Destinations</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteGroup(group.id, group.name)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            {isExpanded && (
                                <div className="px-6 pb-6 animate-slide-down">
                                    <div className="pt-4 border-t border-slate-50">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {groupLocs.map(l => (
                                                <div key={l.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl group/item">
                                                    <span className="text-sm font-bold text-slate-700 truncate">{l.name}</span>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                        <button onClick={() => updateGroupAssignment([l.id], null)} className="p-1 text-slate-400 hover:text-red-500">
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
                                                <Plus size={16} /> Add Destination
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                <div className="bg-slate-50 rounded-[2rem] border border-slate-200 border-dashed overflow-hidden">
                    <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => toggleGroup('NoGroup')}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${expandedGroups.has('NoGroup') ? 'bg-slate-700 text-white' : 'bg-white text-slate-300'}`}>
                                <MapPin size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-700 text-lg">Unassigned Destinations</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{getGroupLocations(null).length} Locations</p>
                            </div>
                        </div>
                    </div>
                    {expandedGroups.has('NoGroup') && (
                        <div className="px-6 pb-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {getGroupLocations(null).map(l => (
                                    <div key={l.id} className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                                        <span className="text-sm font-bold text-slate-600">{l.name}</span>
                                        <button onClick={() => handleDeleteLocation(l.id)} className="p-1 text-slate-300 hover:text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <DestinationSelectorModal
                isOpen={isSelectorOpen}
                onClose={() => setIsSelectorOpen(false)}
                onAdd={(ids) => updateGroupAssignment(ids, targetGroupId)}
                locations={locations}
                groupName={groups.find(g => g.id === targetGroupId)?.name || ''}
            />

            {saving && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-full font-black flex items-center gap-3 shadow-2xl z-50 animate-fade-in">
                    <Loader2 size={20} className="animate-spin" /> Updating Configuration...
                </div>
            )}
        </div>
    );
};
