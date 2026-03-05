import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { ShoppingBag, Menu, X, Instagram, Info, Home, Tag } from 'lucide-react'
import { useStoreSettings } from '../../features/catalogue/StoreSettingsContext'
import { supabase } from '../../lib/supabase'
import type { Program } from '../../types/program'

export const CatalogueLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { settings } = useStoreSettings();
    const location = useLocation();
    const [activePrograms, setActivePrograms] = useState<Program[]>([]);

    useEffect(() => {
        const fetchPrograms = async () => {
            const { data } = await supabase
                .from('programs')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (data) {
                setActivePrograms(data);
            }
        };
        fetchPrograms();
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50/50 relative">
            {/* Sidebar Dark Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Slide-out Sidebar */}
            <div className={`fixed inset-y-0 left-0 w-[280px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white">
                            <ShoppingBag size={14} />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Menu</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 flex-1 flex flex-col space-y-2">
                    <Link
                        to="/"
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${location.pathname === '/' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Home size={18} />
                        Catalogue
                    </Link>
                    <Link
                        to="/about"
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${location.pathname === '/about' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Info size={18} />
                        About Us
                    </Link>

                    {activePrograms.length > 0 && (
                        <div className="pt-4 pb-2">
                            <h3 className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Tag size={12} />
                                Programs
                            </h3>
                            <div className="space-y-1">
                                {activePrograms.map(program => (
                                    <Link
                                        key={program.id}
                                        to={`/program/${program.id}`}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${location.pathname === `/program/${program.id}` ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 pl-8'}`}
                                    >
                                        {program.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {settings?.instagram_url && (
                    <div className="p-6 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Connect With Us</p>
                        <a
                            href={settings.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 bg-pink-50 text-pink-600 hover:bg-pink-100 hover:text-pink-700 rounded-xl font-medium transition-colors"
                        >
                            <Instagram size={18} />
                            Instagram
                        </a>
                    </div>
                )}

                <div className="p-4 border-t border-slate-100 mt-auto bg-slate-50">
                    <Link to="/admin" onClick={() => setIsSidebarOpen(false)} className="flex justify-center text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider text-[10px] font-semibold">
                        Admin Portal
                    </Link>
                </div>
            </div>

            {/* Premium Minimal Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-900 flex items-center justify-center text-white">
                            <ShoppingBag size={16} className="sm:hidden" />
                            <ShoppingBag size={20} className="hidden sm:block" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg sm:text-xl tracking-tight leading-none text-slate-900">BNS HYPE</h1>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider">Catalogue</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                <Outlet />
            </main>

            <footer className="py-8 text-center text-xs sm:text-sm text-slate-400 border-t border-slate-200 mt-auto bg-white">
                <p>&copy; {new Date().getFullYear()} PT. Stakom Trijaya Andala. All rights reserved.</p>
            </footer>
        </div>
    )
}
