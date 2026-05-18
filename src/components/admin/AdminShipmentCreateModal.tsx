import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Loader2, Save, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/useAuthStore';

interface AdminShipmentCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AdminShipmentCreateModal: React.FC<AdminShipmentCreateModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [name, setName] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const { data, error: insertError } = await supabase
                .from('shipments')
                .insert([{ 
                    name: name.trim(), 
                    note: note.trim(),
                    status: 'Upcoming',
                    created_by: user?.id 
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            // Success!
            onSuccess();
            onClose();
            // Redirect to detail page to add products
            if (data) {
                navigate(`/admin/shipments/${data.id}`);
            }
        } catch (err: any) {
            console.error('Failed to create shipment', err);
            setError(err.message || 'Failed to create shipment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-premium max-w-md w-full overflow-hidden animate-slide-up">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight text-left">New Shipment</h2>
                        <p className="text-xs text-slate-500 mt-1 text-left">Create a new shipment record to start tracking products.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700 text-left">Shipment Name / ID</label>
                        <input
                            autoFocus
                            required
                            type="text"
                            placeholder="e.g. Shipment #2026-05-001"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700 text-left">Note (Optional)</label>
                        <textarea
                            placeholder="Add additional details or remarks..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium resize-none"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 text-left">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="flex-2 py-3 px-8 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 shadow-premium flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Create Shipment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
