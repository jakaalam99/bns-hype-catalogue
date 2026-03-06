import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { ShoppingBag, Menu, X, Instagram, Info, Home, Tag } from 'lucide-react'
import { useStoreSettings } from '../../features/catalogue/StoreSettingsContext'
import { supabase } from '../../lib/supabase'
import type { Program } from '../../types/program'

export const CatalogueLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
    const { settings } = useStoreSettings();
    const location = useLocation();
    const [activePrograms, setActivePrograms] = useState<Program[]>([]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 1024) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        <div className="min-h-screen flex flex-col bg-background relative selection:bg-black selection:text-white">
            {/* Animated Grid Background */}
            <div className="fixed inset-0 pointer-events-none z-0 bg-grid-pattern opacity-50" />
            {/* Sidebar Dark Overlay (Mobile Only) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 lg:hidden transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Slide-out Sidebar */}
            <div className={`fixed inset-y-0 left-0 w-[280px] bg-zinc-950 border-r border-white/5 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-zinc-950">
                            <ShoppingBag size={14} />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white uppercase italic">Menu</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 flex-1 flex flex-col space-y-2">
                    <Link
                        to="/"
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${location.pathname === '/' ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Home size={18} />
                        Catalogue
                    </Link>
                    <Link
                        to="/about"
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${location.pathname === '/about' ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Info size={18} />
                        About Us
                    </Link>

                    {activePrograms.length > 0 && (
                        <div className="pt-4 pb-2">
                            <h3 className="px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <Tag size={12} />
                                Programs
                            </h3>
                            <div className="space-y-1">
                                {activePrograms.map(program => (
                                    <Link
                                        key={program.id}
                                        to={`/program/${program.id}`}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${location.pathname === `/program/${program.id}` ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:bg-white/5 hover:text-white pl-8'}`}
                                    >
                                        {program.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {settings?.instagram_url && (
                    <div className="p-6 border-t border-white/5">
                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-3">Instagram</p>
                        <a
                            href={settings.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 bg-white/5 text-white hover:bg-white/10 rounded-xl font-medium transition-all group"
                        >
                            <Instagram size={18} className="group-hover:scale-110 transition-transform" />
                            @bnshype
                        </a>
                    </div>
                )}

                <div className="p-4 border-t border-white/5 mt-auto bg-black/20">
                    <Link to="/admin" onClick={() => setIsSidebarOpen(false)} className="flex justify-center text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest text-[9px] font-bold">
                        Admin Portal
                    </Link>
                </div>
            </div>

            {/* Premium Minimal Header */}
            <header className="sticky top-0 z-30 glass px-4 sm:px-6 py-4 flex items-center justify-between border-b border-border shadow-sm">
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
                            <h1 className="font-display font-bold text-lg sm:text-xl tracking-tight leading-none text-foreground">BNS HYPE</h1>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider">Catalogue</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className={`flex-1 w-full transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:pl-[280px]' : 'pl-0'}`}>
                <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                    <Outlet />
                </div>
            </main>

            <footer className="py-8 text-center text-xs sm:text-sm text-muted-foreground border-t border-border mt-auto bg-surface">
                <p>&copy; {new Date().getFullYear()} PT. Stakom Trijaya Andala. All rights reserved.</p>
            </footer>
        </div>
    )
}
