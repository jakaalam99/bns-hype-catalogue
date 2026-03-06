import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { ShoppingBag, Menu, X, Instagram, Info, Home, Tag, Search } from 'lucide-react'
import { useStoreSettings } from '../../features/catalogue/StoreSettingsContext'
import { supabase } from '../../lib/supabase'
import type { Program } from '../../types/program'
import { BackgroundParticles } from '../BackgroundParticles'

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
            <div className="bg-grid-pattern" />
            <BackgroundParticles />

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
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-4 border-b border-border shadow-sm">
                <div className="max-w-7xl mx-auto grid grid-cols-3 items-center">
                    {/* Left: Menu & Brand Icon */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 bg-transparent text-black hover:bg-black/5 rounded-lg transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                    </div>

                    {/* Center: Title */}
                    <div className="flex flex-col items-center justify-center text-center">
                        <Link to="/" className="group">
                            <h1 className="font-display font-black text-2xl sm:text-3xl tracking-[0.2em] leading-none text-foreground uppercase italic animate-glow-text animate-shimmer">
                                BNS HYPE
                            </h1>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-black uppercase tracking-[0.4em] mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                Catalogue
                            </p>
                        </Link>
                    </div>

                    {/* Right: Spacer */}
                    <div className="flex justify-end items-center" />
                </div>
            </header>

            {/* Floating Bottom Search Bar */}
            {location.pathname === '/' && (
                <div className="fixed bottom-6 left-0 right-0 z-40 px-3 sm:px-6 pointer-events-none">
                    <div className="max-w-7xl mx-auto flex justify-center">
                        <div className="relative w-full max-w-[95vw] sm:max-w-3xl pointer-events-auto">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search size={22} className="text-zinc-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search catalogue..."
                                value={location.pathname === '/' ? new URLSearchParams(location.search).get('q') || '' : ''}
                                onChange={(e) => {
                                    if (location.pathname === '/') {
                                        const params = new URLSearchParams(location.search);
                                        if (e.target.value) params.set('q', e.target.value);
                                        else params.delete('q');
                                        params.set('page', '1');
                                        window.history.replaceState(null, '', `?${params.toString()}`);
                                        window.dispatchEvent(new Event('popstate'));
                                    } else {
                                        window.location.href = `/?q=${encodeURIComponent(e.target.value)}`;
                                    }
                                }}
                                className="block w-full pl-12 pr-6 py-4.5 sm:py-5 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] text-base sm:text-lg text-white placeholder-zinc-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-medium"
                            />
                        </div>
                    </div>
                </div>
            )}

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
    );
};
