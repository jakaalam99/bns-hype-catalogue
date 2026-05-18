import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Loader2, Save } from 'lucide-react';
import type { Shipment } from '../../types/shipment';

interface AdminShipmentEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    shipment: Shipment | null;
}

export const AdminShipmentEditModal = ({ isOpen, onClose, onSuccess, shipment }: AdminShipmentEditModalProps) => {
    const [name, setName] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (shipment) {
            setName(shipment.name);
            setNote(shipment.note || '');
        }
    }, [shipment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shipment) return;
        
        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('shipments')
                .update({ 
                    name: name.trim(),
                    note: note.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', shipment.id);

            if (updateError) throw updateError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error updating shipment:', err);
            setError(err.message || 'Failed to update shipment');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Edit Shipment</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Shipment Name</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g. USS 2024 - Batch 1"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Note (Optional)</label>
                        <textarea
                            placeholder="Add any additional details or instructions..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium resize-none"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <Save size={18} />
                            )}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
