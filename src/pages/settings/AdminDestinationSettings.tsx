import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Plus, Trash2, Truck } from 'lucide-react';

export const AdminDestinationSettings = () => {
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newLocation, setNewLocation] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('destination_locations')
                .select('*')
                .order('name');
            if (error) throw error;
            setLocations(data || []);
        } catch (err: any) {
            console.error('Failed to fetch destinations', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newLocation.trim();
        if (!trimmed) return;

        setAdding(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('destination_locations')
                .insert([{ name: trimmed }])
                .select();
            if (error) {
                if (error.code === '23505') throw new Error('Location already exists.');
                throw error;
            }
            if (data) {
                setLocations([...locations, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
            }
            setNewLocation('');
        } catch (err: any) {
            setError(err.message || 'Failed to add location');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This might break existing request dependencies.`)) return;
        
        try {
            const { error } = await supabase.from('destination_locations').delete().eq('id', id);
            if (error) throw error;
            setLocations(locations.filter(loc => loc.id !== id));
        } catch (err: any) {
            alert(`Failed to delete: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                <p>Loading destination locations...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Destination Locations</h1>
                <p className="text-sm text-slate-500">Manage the list of approved destination locations for inventory requests.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Truck className="text-indigo-600" size={18} />
                        Active Locations
                    </h2>
                </div>
                
                <div className="p-6">
                    <form onSubmit={handleAdd} className="flex gap-3 mb-8">
                        <input
                            type="text"
                            value={newLocation}
                            onChange={(e) => setNewLocation(e.target.value)}
                            placeholder="Enter new destination name (e.g. USS 2024, JCC Expo)"
                            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                        />
                        <button
                            type="submit"
                            disabled={adding || !newLocation.trim()}
                            className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 shadow-sm whitespace-nowrap"
                        >
                            {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            Add Location
                        </button>
                    </form>

                    {error && (
                        <div className="p-3 mb-6 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {locations.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <Truck size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-slate-500 font-medium font-sm">No destinations added yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {locations.map((loc) => (
                                <div key={loc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm group hover:border-indigo-200 transition-colors">
                                    <span className="font-medium text-slate-700 text-sm truncate pr-2" title={loc.name}>
                                        {loc.name}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(loc.id, loc.name)}
                                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete location"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
