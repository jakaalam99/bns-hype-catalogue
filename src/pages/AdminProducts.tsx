import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ProductWithImages } from '../types/product';
import { Loader2, Plus, Search, FileDown, FileUp, Trash2, Edit } from 'lucide-react';
import { ProductForm } from '../features/admin/ProductForm';
import { ImportCSVForm } from '../features/admin/ImportCSVForm';
import { formatIDR } from '../lib/utils';
import * as XLSX from 'xlsx';

export const AdminProducts = () => {
    const [products, setProducts] = useState<ProductWithImages[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isCSVOpen, setIsCSVOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductWithImages | null>(null);
    const [programs, setPrograms] = useState<any[]>([]);
    const [imageFilter, setImageFilter] = useState<'all' | 'with_images' | 'no_images'>('all');


    // Sorting
    const [sortColumn, setSortColumn] = useState<string>('updated_at');
    const [sortAscending, setSortAscending] = useState<boolean>(false);

    useEffect(() => {
        fetchProducts();
    }, [sortColumn, sortAscending]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            // Using Supabase to fetch products and eagerly load their images
            const { data, error } = await supabase
                .from('products')
                .select(`
                    *,
                    images:product_images(*)
                `)
                .order(sortColumn, { ascending: sortAscending });

            if (error) throw error;

            // Also fetch active programs to associate with products for export
            const { data: programsData, error: progError } = await supabase
                .from('programs')
                .select('*')
                .eq('is_active', true);

            if (progError) console.error("Could not fetch programs for export:", progError);
            else setPrograms(programsData || []);

            // Format the images array since postgrest might return slightly differently
            console.log('AdminProducts: Fetched products sample:', data ? data[0] : 'null');
            setProducts(data as any);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteProduct = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;

        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            fetchProducts();
        } catch (error: any) {
            console.error("Error deleting product", error);
            alert("Failed to delete product: " + error.message);
        }
    };

    const handleExportExcel = () => {
        if (products.length === 0) {
            alert("No products available to export.");
            return;
        }

        const exportData = products.map(product => {
            // Re-derive discount metrics if there is a discount_price
            let derivedPercentage = '';
            let derivedAmount = '';

            if (product.discount_price !== null && product.discount_price !== undefined) {
                // If the discount is a clean percentage (e.g., exactly 10%, 20%), we might deduce it.
                // However, without explicitly knowing how it was entered, we derive both if possible,
                // but usually, it's safer to just represent the raw price subtraction as the amount.
                // To be robust, let's calculate the amount. The user can recalculate % if needed.
                const diff = product.price - product.discount_price;
                if (diff > 0) {
                    derivedAmount = diff.toString();
                    // Optional: Try to detect if it was a clean percentage
                    const pct = (diff / product.price) * 100;
                    if (Number.isInteger(pct)) {
                        derivedPercentage = pct.toString();
                    }
                }
            }

            // Map applied programs
            const appliedPrograms = programs
                .filter(prog => prog.skus && prog.skus.includes(product.sku))
                .map(prog => prog.name)
                .join(', ');

            return {
                sku: product.sku,
                barcode: product.barcode || '',
                brand: product.brand || '',
                category: product.category || '',
                name: product.name,
                price: product.price,
                discount_price: product.discount_price ?? '',
                discount_percentage: derivedPercentage,
                discount_amount: derivedAmount,
                'Final Price': product.discount_price !== null ? product.discount_price : product.price,
                'Programs Applied to': appliedPrograms
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

        XLSX.writeFile(workbook, `bns-products-export-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const toggleSort = (column: string) => {
        if (sortColumn === column) {
            setSortAscending(!sortAscending);
        } else {
            setSortColumn(column);
            setSortAscending(column === 'name' || column === 'sku'); // default asc for text, desc for others
        }
    };

    // Helper to render sort arrow
    const renderSortIcon = (column: string) => {
        if (sortColumn !== column) return null;
        return (
            <span className="ml-1 inline-block">
                {sortAscending ? '↑' : '↓'}
            </span>
        );
    };

    // Deriving filtered products locally for search and image status
    // We use useMemo for stable filtering and performance
    const filteredProducts = (products || []).filter(product => {
        // Search filter
        const matchesSearch = searchQuery.trim() === '' ||
            (product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (product.sku || '').toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        // Image filter: Using the robust SQL-backed has_images flag
        const hasImages = (product as any).has_images === true;

        if (imageFilter === 'with_images') return hasImages;
        if (imageFilter === 'no_images') return !hasImages;

        return true;
    });

    return (
        <div className="space-y-6 animate-fade-in relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products</h1>
                    <p className="text-sm text-slate-500">Manage your catalogue inventory.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleExportExcel}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
                    >
                        <FileUp size={16} />
                        Export Excel
                    </button>
                    <button
                        onClick={() => setIsCSVOpen(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
                    >
                        <FileDown size={16} />
                        Import Excel
                    </button>
                    <button
                        onClick={() => {
                            setEditingProduct(null);
                            setIsFormOpen(true);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
                    >
                        <Plus size={16} />
                        Add Product
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <form
                        onSubmit={(e) => e.preventDefault()}
                        className="relative w-full max-w-md"
                    >
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by SKU or Name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-slate-50 hover:bg-white"
                        />
                    </form>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <select
                            value={imageFilter}
                            onChange={(e) => setImageFilter(e.target.value as any)}
                            className="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 transition-colors hover:bg-slate-50"
                        >
                            <option value="all">All Image Status</option>
                            <option value="with_images">With Images</option>
                            <option value="no_images">No Images</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold select-none">
                                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('name')}>
                                    Product {renderSortIcon('name')}
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('sku')}>
                                    SKU {renderSortIcon('sku')}
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('price')}>
                                    Price {renderSortIcon('price')}
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('updated_at')}>
                                    Date Modified {renderSortIcon('updated_at')}
                                </th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Loader2 className="animate-spin text-indigo-600 mb-2" size={24} />
                                            <p className="text-sm">Loading catalogue...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                                <Search size={20} className="text-slate-400" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-900">No products found</p>
                                            <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => {


                                    const primaryImage = product.images?.find((img: any) => img.display_order === 0) || product.images?.[0];

                                    return (
                                        <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        {primaryImage ? (
                                                            // We construct the public URL for the Supabase Storage bucket
                                                            <img
                                                                src={supabase.storage.from('product-images').getPublicUrl(primaryImage.image_url).data.publicUrl}
                                                                alt={product.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-xs text-slate-400 font-medium tracking-tight">NO IMG</span>
                                                        )}
                                                    </div>
                                                    <div className="font-medium text-slate-900 text-sm line-clamp-2">
                                                        {product.name}
                                                    </div>
                                                    <div className="flex gap-2 mt-1">
                                                        {product.brand && <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{product.brand}</span>}
                                                        {product.category && <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{product.category}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                                                {product.sku}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {product.discount_price ? (
                                                    <div>
                                                        <span className="font-medium text-slate-900">{formatIDR(product.discount_price)}</span>
                                                        <span className="text-xs line-through text-red-500 ml-2">{formatIDR(product.price)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="font-medium text-slate-900">{formatIDR(product.price)}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                                                {new Date((product as any).updated_at).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                                                    Active
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingProduct(product);
                                                            setIsFormOpen(true);
                                                        }}
                                                        className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                        title="Edit Product"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteProduct(product.id)}
                                                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                        title="Delete Product"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Placeholder */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-medium">Showing {products.length} products</p>
                    <div className="flex gap-2">
                        <button disabled className="px-3 py-1 text-xs font-medium border border-slate-200 rounded text-slate-400 bg-slate-50 cursor-not-allowed">Previous</button>
                        <button disabled className="px-3 py-1 text-xs font-medium border border-slate-200 rounded text-slate-400 bg-slate-50 cursor-not-allowed">Next</button>
                    </div>
                </div>
            </div>

            {isFormOpen && (
                <ProductForm
                    productToEdit={editingProduct}
                    onClose={() => setIsFormOpen(false)}
                    onSuccess={() => {
                        setIsFormOpen(false);
                        fetchProducts();
                    }}
                />
            )}

            {isCSVOpen && (
                <ImportCSVForm
                    onClose={() => setIsCSVOpen(false)}
                    onSuccess={() => {
                        setIsCSVOpen(false);
                        fetchProducts();
                    }}
                />
            )}
        </div>
    );
};
