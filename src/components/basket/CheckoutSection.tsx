import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { useBasket } from '../../features/catalogue/BasketContext';
import { Loader2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CheckoutSection = () => {
    const { items, clearBasket } = useBasket();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    
    const [locations, setLocations] = useState<{name: string}[]>([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLocs = async () => {
            const { data } = await supabase.from('destination_locations').select('name').order('name');
            if (data) setLocations(data);
        };
        fetchLocs();
    }, []);

    const handleSubmitRequest = async () => {
        if (items.length === 0) {
            setError('Basket is empty');
            return;
        }
        
        // Ensure destination location is chosen either globally or per item.
        // We will default to selectedLocation for all items if they don't have one specific to them.
        const itemsWithDest = items.map(i => {
            const dest = (i as any).destination_location || selectedLocation;
            if (!dest) throw new Error(`Missing Destination Location for SKU ${i.sku}`);
            return dest;
        });

        if (!selectedLocation && items.some(i => !(i as any).destination_location)) {
            setError('Please select a Default Destination Location for your items.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const rpcPayload = items.map(item => ({
                product_id: item.id,
                sku: item.sku,
                product_name: item.name,
                qty: item.quantity,
                destination_location: (item as any).destination_location || selectedLocation
            }));

            const { data, error: rpcError } = await supabase.rpc('submit_inventory_request', {
                p_requestor_id: user?.id,
                p_requestor_role: user?.user_metadata?.role || 'BELI_PUTUS',
                p_items: rpcPayload
            });

            if (rpcError) throw rpcError;

            // Success
            clearBasket();
            navigate('/requests'); // Go to status page
            
        } catch (err: any) {
            console.error("Submission failed:", err);
            setError(err.message || 'Failed to submit request. Please try again or contact administrator.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-lg">Request Submission</h3>
            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100">
                    {error}
                </div>
            )}
            
            <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">Default Destination Location</label>
                <p className="text-xs text-slate-500 mb-2">Required for items added directly from Catalogue.</p>
                <div className="relative">
                    <select
                        value={selectedLocation}
                        onChange={e => setSelectedLocation(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-all"
                    >
                        <option value="">-- Select Destination Location --</option>
                        {locations.map(loc => (
                            <option key={loc.name} value={loc.name}>{loc.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                </div>
            </div>

            <button
                onClick={handleSubmitRequest}
                disabled={loading || items.length === 0}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition flex justify-center items-center gap-2 shadow-sm disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                {loading ? 'Processing...' : 'Submit Request & Deduct Stock'}
            </button>
        </div>
    );
};
