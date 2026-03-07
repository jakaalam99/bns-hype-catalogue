import { useState, useMemo } from 'react';
import { useBasket } from '../features/catalogue/BasketContext';
import { Trash2, Plus, Minus, FileSpreadsheet, ShoppingCart, ArrowLeft, Trash, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { BackgroundParticles } from '../components/BackgroundParticles';

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

    // Reset pagination when searching
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    if (items.length === 0) {
        return (
            <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
                <BackgroundParticles count={30} />
                <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 text-center animate-fade-in">
                    <div className="w-24 h-24 bg-zinc-900/50 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-8 text-zinc-700 border border-white/5">
                        <ShoppingCart size={48} />
                    </div>
                    <h2 className="text-3xl font-display font-black text-white mb-4 tracking-tight uppercase italic">Your Basket is Empty</h2>
                    <p className="text-zinc-500 mb-10 max-w-md mx-auto font-medium">Looks like you haven't added any products to your list yet. Browse our catalogue to get started.</p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-white text-zinc-950 font-bold px-8 py-4 rounded-xl hover:bg-zinc-200 transition shadow-premium group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Catalogue
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-zinc-950 overflow-hidden pt-12">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            <BackgroundParticles count={40} />

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 animate-fade-in-up">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                    <div>
                        <h1 className="text-5xl font-display font-black text-white uppercase italic tracking-tighter mb-4">
                            My <span className="text-indigo-500">Basket</span>
                        </h1>
                        <p className="text-zinc-500 font-bold tracking-widest uppercase text-xs">
                            {totalCount} Total Units <span className="mx-2 text-zinc-800">|</span> {filteredItems.length} Products Found
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <button
                            onClick={clearBasket}
                            className="flex items-center gap-2 px-6 py-4 bg-zinc-900/50 backdrop-blur-md border border-red-500/20 text-red-400 font-bold rounded-xl hover:bg-red-500/10 transition-all text-xs uppercase tracking-widest"
                        >
                            <Trash size={16} />
                            Clear All
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 px-8 py-4 bg-white text-zinc-950 font-black rounded-xl hover:bg-zinc-200 transition shadow-premium text-xs uppercase tracking-widest"
                        >
                            <FileSpreadsheet size={16} />
                            Export Excel
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-8 group">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative flex items-center bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl px-6 py-4 focus-within:border-indigo-500/50 transition-all">
                        <Search className="text-zinc-500 mr-4" size={20} />
                        <input
                            type="text"
                            placeholder="Search in basket (Name, SKU, Brand)..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="bg-transparent border-none text-white focus:ring-0 w-full placeholder:text-zinc-600 font-medium"
                        />
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-zinc-900/30 backdrop-blur-xl rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Product details</th>
                                <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] text-center">Brand & SKU</th>
                                <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] text-center">Quantity</th>
                                <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {paginatedItems.map((item) => (
                                <tr key={item.sku} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-8">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white text-lg mb-1 group-hover:text-indigo-400 transition-colors line-clamp-1">{item.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{item.category || 'Uncategorized'}</span>
                                                <span className="text-zinc-800">|</span>
                                                <span className="text-[10px] font-mono text-zinc-500">{item.barcode || '-'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-8 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <span className="text-xs font-black text-white bg-zinc-800 px-3 py-1 rounded-full mb-2 border border-white/5">{item.brand || 'BNS'}</span>
                                            <span className="text-[10px] font-mono text-zinc-500">{item.sku}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-8">
                                        <div className="flex items-center justify-center">
                                            <div className="flex items-center bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-inner">
                                                <button
                                                    onClick={() => updateQuantity(item.sku, item.quantity - 1)}
                                                    className="p-2 px-4 hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <div className="w-12 text-center font-bold text-white tabular-nums">
                                                    {item.quantity}
                                                </div>
                                                <button
                                                    onClick={() => updateQuantity(item.sku, item.quantity + 1)}
                                                    className="p-2 px-4 hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-8 text-right">
                                        <button
                                            onClick={() => removeFromBasket(item.sku)}
                                            className="p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
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
                        <div key={item.sku} className="bg-zinc-900/30 backdrop-blur-xl border border-white/5 rounded-3xl p-6 space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-2 pr-4">
                                    <h3 className="font-bold text-white leading-tight text-lg">{item.name}</h3>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <span className="text-[10px] font-black bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full border border-white/5 tracking-wider uppercase">{item.sku}</span>
                                        <span className="text-[10px] font-black text-indigo-500 tracking-widest uppercase">{item.brand}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFromBasket(item.sku)}
                                    className="p-3 bg-red-500/10 text-red-500 rounded-2xl transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Adjust units</span>
                                <div className="flex items-center bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-inner">
                                    <button
                                        onClick={() => updateQuantity(item.sku, item.quantity - 1)}
                                        className="p-3 px-5 hover:bg-white/5 text-zinc-400 transition-colors"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <div className="w-14 text-center font-bold text-white tabular-nums">
                                        {item.quantity}
                                    </div>
                                    <button
                                        onClick={() => updateQuantity(item.sku, item.quantity + 1)}
                                        className="p-3 px-5 hover:bg-white/5 text-zinc-400 transition-colors"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-12 flex items-center justify-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-3 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="flex items-center gap-2 px-4">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-10 h-10 rounded-xl font-bold text-xs transition-all ${currentPage === page
                                        ? 'bg-white text-zinc-950 shadow-premium'
                                        : 'bg-zinc-900 text-zinc-500 hover:text-white border border-white/5'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-3 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                <div className="mt-20 text-center pb-12">
                    <p className="text-zinc-600 text-xs italic font-medium uppercase tracking-[0.2em] max-w-lg mx-auto leading-relaxed">
                        Data stored locally in your current browser session. Export to excel to save permanently.
                    </p>
                </div>
            </div>
        </div>
    );
};
