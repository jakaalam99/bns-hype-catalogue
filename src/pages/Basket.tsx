import { useState, useMemo } from 'react';
import { useBasket } from '../features/catalogue/BasketContext';
import { Trash2, Plus, Minus, FileSpreadsheet, ShoppingCart, ArrowLeft, Trash, Search, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { BackgroundParticles } from '../components/BackgroundParticles';
import { supabase } from '../lib/supabase';

const ITEMS_PER_PAGE = 10;

export const Basket = () => {
    const { items, removeFromBasket, updateQuantity, clearBasket, totalCount } = useBasket();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const exportToExcel = () => {
        if (items.length === 0) return;

        const date = new Date().toISOString().split('T')[0];
        const fileName = `Product_Basket_${date}.xlsx`;

        const data = items.map(item => ({
            'Brand': item.brand,
            'Barcode': item.barcode,
            'SKU': item.sku,
            'Product Name': item.name,
            'Category': item.category,
            'Quantity': item.quantity
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Basket Items');

        const wscols = [
            { wch: 20 }, // Brand
            { wch: 20 }, // Barcode
            { wch: 20 }, // SKU
            { wch: 40 }, // Product Name
            { wch: 20 }, // Category
            { wch: 10 }  // Quantity
        ];
        ws['!cols'] = wscols;

        XLSX.writeFile(wb, fileName);
    };

    const filteredItems = useMemo(() => {
        return items.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.brand.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [items, searchQuery]);

    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredItems.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredItems, currentPage]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    if (items.length === 0) {
        return (
            <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-slate-50">
                <BackgroundParticles count={20} />
                <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 text-center animate-fade-in">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 text-slate-200 shadow-sm border border-slate-100">
                        <ShoppingCart size={48} />
                    </div>
                    <h2 className="text-3xl font-display font-black text-slate-900 mb-4 tracking-tight uppercase">Your Basket is Empty</h2>
                    <p className="text-slate-500 mb-10 max-w-md mx-auto font-medium">Browse our collection and add items to your list.</p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-black text-white font-bold px-8 py-4 rounded-xl hover:bg-zinc-800 transition shadow-premium group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        Explore Catalogue
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-slate-50/50 overflow-hidden pt-12 pb-24">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]" />
            <BackgroundParticles count={20} />

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 animate-fade-in-up">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
                                <ShoppingCart size={20} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Product Selection</span>
                        </div>
                        <h1 className="text-5xl font-display font-black text-slate-900 uppercase tracking-tighter">
                            My <span className="text-black">Basket</span>
                        </h1>
                        <p className="text-slate-500 font-bold tracking-widest uppercase text-[10px] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            {totalCount} Total Items <span className="text-slate-200">|</span> {filteredItems.length} Products Found
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <button
                            onClick={clearBasket}
                            className="flex items-center gap-2 px-6 py-4 bg-white border border-red-100 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-all text-xs uppercase tracking-widest shadow-sm"
                        >
                            <Trash size={16} />
                            Clear All
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 px-8 py-4 bg-black text-white font-black rounded-xl hover:bg-zinc-800 transition shadow-premium text-xs uppercase tracking-widest"
                        >
                            <FileSpreadsheet size={16} />
                            Export to Excel
                        </button>
                    </div>
                </div>

                {/* Modern Search Bar */}
                <div className="relative mb-10 group">
                    <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl px-6 py-4 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all shadow-sm">
                        <Search className="text-slate-400 mr-4" size={20} />
                        <input
                            type="text"
                            placeholder="Filter items by name, SKU, or Brand..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="bg-transparent border-none text-slate-900 focus:ring-0 w-full placeholder:text-slate-400 font-medium"
                        />
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black border-b border-black">
                                <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.3em]">Item Details</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.3em] text-center">Reference</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.3em] text-center">Quantity</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.3em] text-right">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedItems.map((item) => (
                                <tr key={item.sku} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-6">
                                            <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shadow-inner flex-shrink-0 border border-slate-200 flex items-center justify-center p-2">
                                                {item.image_url ? (
                                                    <img
                                                        src={supabase.storage.from('product-images').getPublicUrl(item.image_url).data.publicUrl}
                                                        alt={item.name}
                                                        className="w-full h-full object-contain mix-blend-multiply transition-transform group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <Package className="text-slate-300" size={32} />
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-slate-900 text-lg mb-1 group-hover:text-indigo-600 transition-colors truncate">{item.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">{item.category || 'Standard'}</span>
                                                    <span className="text-slate-200 font-light">|</span>
                                                    <span className="text-[10px] font-mono text-slate-500">BC: {item.barcode || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center text-slate-900">
                                        <div className="inline-flex flex-col items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.brand || 'BNS'}</span>
                                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200/50">{item.sku}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-center">
                                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                                                <button
                                                    onClick={() => updateQuantity(item.sku, item.quantity - 1)}
                                                    className="p-2 px-4 hover:bg-white text-slate-400 hover:text-indigo-600 transition-colors"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <div className="w-12 text-center font-bold text-slate-900 tabular-nums">
                                                    {item.quantity}
                                                </div>
                                                <button
                                                    onClick={() => updateQuantity(item.sku, item.quantity + 1)}
                                                    className="p-2 px-4 hover:bg-white text-slate-400 hover:text-indigo-600 transition-colors"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => removeFromBasket(item.sku)}
                                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {paginatedItems.map((item) => (
                        <div key={item.sku} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
                            <div className="flex gap-4">
                                <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100 p-2 flex items-center justify-center">
                                    {item.image_url ? (
                                        <img
                                            src={supabase.storage.from('product-images').getPublicUrl(item.image_url).data.publicUrl}
                                            alt={item.name}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <Package className="text-slate-300" size={24} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-slate-900 leading-tight truncate">{item.name}</h3>
                                        <button
                                            onClick={() => removeFromBasket(item.sku)}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors ml-2"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <span className="text-[10px] font-black bg-slate-50 text-slate-500 px-2 py-1 rounded-lg border border-slate-100 tracking-wider uppercase">{item.sku}</span>
                                        <span className="text-[10px] font-black text-indigo-600 tracking-widest uppercase py-1">{item.brand}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adjust Quantity</span>
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                                    <button
                                        onClick={() => updateQuantity(item.sku, item.quantity - 1)}
                                        className="p-3 px-5 hover:bg-white text-slate-400 transition-colors"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <div className="w-14 text-center font-bold text-slate-900 tabular-nums">
                                        {item.quantity}
                                    </div>
                                    <button
                                        onClick={() => updateQuantity(item.sku, item.quantity + 1)}
                                        className="p-3 px-5 hover:bg-white text-slate-400 transition-colors"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Modern Pagination Navigation */}
                {totalPages > 1 && (
                    <div className="mt-12 flex items-center justify-center gap-3">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-black hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="flex items-center gap-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-11 h-11 rounded-2xl font-bold text-xs transition-all ${currentPage === page
                                        ? 'bg-black text-white shadow-premium scale-110'
                                        : 'bg-white text-slate-500 hover:text-black border border-slate-200 shadow-sm'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-black hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                {/* Footer disclaimer */}
                <div className="mt-20 text-center pb-12 opacity-50">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em] max-w-lg mx-auto leading-relaxed">
                        Selection temporarily stored in local storage
                    </p>
                </div>
            </div>
        </div>
    );
};
