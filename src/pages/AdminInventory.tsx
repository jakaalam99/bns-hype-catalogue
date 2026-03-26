import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Package, Loader2, AlertCircle, Upload } from 'lucide-react';
import type { Warehouse } from '../types/warehouse';
import type { Product } from '../types/product';
import { AdminStockImportModal } from '../components/admin/AdminStockImportModal';

// Extended product type with stock breakdown
interface InventoryProduct extends Product {
    total_stock: number;
    warehouse_breakdown: Record<string, number>;
}

export const AdminInventory = () => {
    const [inventory, setInventory] = useState<InventoryProduct[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    useEffect(() => {
        fetchInventoryData();
    }, []);

    const fetchInventoryData = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch all warehouses to know columns
            const { data: wData, error: wError } = await supabase
                .from('warehouses')
                .select('*')
                .order('name');
            if (wError) throw wError;
            
            const fetchedWarehouses = wData as Warehouse[];
            setWarehouses(fetchedWarehouses);

            // 2. Fetch products
            const { data: pData, error: pError } = await supabase
                .from('products')
                .select('id, name, sku')
                .order('created_at', { ascending: false });
            if (pError) throw pError;

            // 3. Fetch warehouse stocks
            const { data: sData, error: sError } = await supabase
                .from('warehouse_stocks')
                .select('product_id, warehouse_id, quantity');
            if (sError) throw sError;

            // 4. Map data
            const stocks = sData as any[];
            const mappedInventory: InventoryProduct[] = (pData as Product[]).map(product => {
                const productStocks = stocks.filter(s => s.product_id === product.id);
                let total = 0;
                const breakdown: Record<string, number> = {};
                
                // Initialize all warehouses to 0 for this product
                fetchedWarehouses.forEach(w => { breakdown[w.name] = 0; });

                productStocks.forEach(s => {
                    const wName = fetchedWarehouses.find(w => w.id === s.warehouse_id)?.name;
                    if (wName) {
                        breakdown[wName] = s.quantity;
                        total += s.quantity;
                    }
                });

                return {
                    ...product,
                    total_stock: total,
                    warehouse_breakdown: breakdown
                };
            });

            setInventory(mappedInventory);
        } catch (err: any) {
            console.error('Error fetching inventory:', err);
            setError('Failed to load inventory data.');
        } finally {
            setLoading(false);
        }
    };

    const filteredInventory = inventory.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory</h1>
                    <p className="text-sm text-slate-500">View real-time stock levels across all your warehouses.</p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by SKU or Product Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    {loading && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Loader2 className="animate-spin" size={16} /> Syncing Inventory
                        </div>
                    )}
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap"
                    >
                        <Upload size={18} />
                        Import Additions
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {/* Inventory Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap">Product</th>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap">SKU</th>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap border-r border-slate-200 text-center">Total Qty</th>
                                {warehouses.map(w => (
                                    <th key={w.id} className="px-6 py-4 font-semibold whitespace-nowrap text-center">
                                        {w.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredInventory.length === 0 ? (
                                <tr>
                                    <td colSpan={3 + warehouses.length} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Package size={32} className="text-slate-300 mb-2" />
                                            {searchTerm ? 'No products found matching your search.' : 'No products in inventory.'}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInventory.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 max-w-[200px] truncate" title={item.name}>
                                            {item.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <code className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-xs rounded">{item.sku}</code>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200 text-center">
                                            <span className={`inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-md text-xs font-bold ${item.total_stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                {item.total_stock}
                                            </span>
                                        </td>
                                        {warehouses.map(w => (
                                            <td key={w.id} className="px-6 py-4 whitespace-nowrap text-center text-slate-500 font-mono">
                                                {item.warehouse_breakdown[w.name] === 0 ? (
                                                    <span className="text-slate-300">-</span>
                                                ) : (
                                                    item.warehouse_breakdown[w.name]
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AdminStockImportModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={fetchInventoryData}
            />
        </div>
    );
};
