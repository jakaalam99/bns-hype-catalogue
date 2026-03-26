import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, LogOut, Settings, Tag, Menu, X, FileText, ClipboardList, Instagram, ShoppingBag, MapPin, Store, Send, Truck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { BackgroundParticles } from '../BackgroundParticles'
import { useAuthStore } from '../../features/auth/useAuthStore'

export const AdminLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const role = user?.user_metadata?.role || 'ADMIN'; // default to ADMIN if no role is set
    const isSuperAdmin = role === 'ADMIN';

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
    };
    return (
        <div className="min-h-screen bg-muted/30 flex relative overflow-hidden">
            {/* Animated Grid Background */}
            <div className="bg-grid-pattern" />
            <BackgroundParticles />

            {/* Sidebar sidebar */}
            <aside className="w-64 bg-surface border-r border-border hidden md:flex flex-col">
                <div className="p-6">
                    <h2 className="font-bold text-lg tracking-tight">Admin System</h2>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">BNS Hype</p>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <NavLink
                        to="/admin/dashboard"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <LayoutDashboard size={18} />
                        Dashboard
                    </NavLink>

                    {['MD', 'FINANCE', 'ADMIN'].includes(role) && (
                        <NavLink
                            to="/admin/requests"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`
                            }
                        >
                            <Send size={18} />
                            Requests
                        </NavLink>
                    )}

                    {isSuperAdmin && (
                        <>

                    <NavLink
                        to="/admin/products"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <Package size={18} />
                        Products
                    </NavLink>

                    <NavLink
                        to="/admin/programs"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <Tag size={18} />
                        Programs
                    </NavLink>

                    <NavLink
                        to="/admin/inventory"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <ClipboardList size={18} />
                        Inventory
                    </NavLink>

                    <NavLink
                        to="/admin/brand-guidance"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <FileText size={18} />
                        Brand Guidance
                    </NavLink>

                    <div className="pt-4 pb-1">
                        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Store Configuration
                        </p>
                    </div>

                    <NavLink
                        to="/admin/settings/general"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <Settings size={18} />
                        General Information
                    </NavLink>

                    <NavLink
                        to="/admin/settings/socials"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <Instagram size={18} />
                        Social Media
                    </NavLink>

                    <NavLink
                        to="/admin/settings/marketplaces"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <ShoppingBag size={18} />
                        Marketplaces
                    </NavLink>

                    <NavLink
                        to="/admin/settings/offline-stores"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <MapPin size={18} />
                        Offline Stores
                    </NavLink>

                    <NavLink
                        to="/admin/settings/warehouses"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <Store size={18} />
                        Warehouse Visibility
                    </NavLink>

                    <NavLink
                        to="/admin/settings/destinations"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <Truck size={18} />
                        Destinations
                    </NavLink>
                    </>
                    )}
                </nav>

                <div className="p-4 border-t border-border">
                    <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar Drawer */}
            <aside className={`fixed inset-y-0 left-0 w-64 bg-surface border-r border-border z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-lg tracking-tight">Admin System</h2>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">BNS Hype</p>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-500 hover:bg-slate-100 p-2 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <NavLink
                        to="/admin/dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <LayoutDashboard size={18} />
                        Dashboard
                    </NavLink>

                    {['MD', 'FINANCE', 'ADMIN'].includes(role) && (
                        <NavLink
                            to="/admin/requests"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`
                            }
                        >
                            <Send size={18} />
                            Requests
                        </NavLink>
                    )}

                    {isSuperAdmin && (
                        <>

                    <NavLink
                        to="/admin/products"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <Package size={18} />
                        Products
                    </NavLink>

                    <NavLink
                        to="/admin/programs"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <Tag size={18} />
                        Programs
                    </NavLink>

                    <NavLink
                        to="/admin/inventory"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <ClipboardList size={18} />
                        Inventory
                    </NavLink>

                    <NavLink
                        to="/admin/brand-guidance"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <FileText size={18} />
                        Brand Guidance
                    </NavLink>

                    <div className="pt-4 pb-1">
                        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Store Configuration
                        </p>
                    </div>

                    <NavLink
                        to="/admin/settings/general"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <Settings size={18} />
                        General Information
                    </NavLink>

                    <NavLink
                        to="/admin/settings/socials"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <Instagram size={18} />
                        Social Media
                    </NavLink>

                    <NavLink
                        to="/admin/settings/marketplaces"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <ShoppingBag size={18} />
                        Marketplaces
                    </NavLink>

                    <NavLink
                        to="/admin/settings/offline-stores"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <MapPin size={18} />
                        Offline Stores
                    </NavLink>

                    <NavLink
                        to="/admin/settings/warehouses"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <Store size={18} />
                        Warehouse Visibility
                    </NavLink>

                    <NavLink
                        to="/admin/settings/destinations"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                        }
                    >
                        <Truck size={18} />
                        Destinations
                    </NavLink>
                    </>
                    )}
                </nav>

                <div className="p-4 border-t border-border">
                    <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Mobile Header (Hidden on Desktop) */}
                <header className="md:hidden bg-surface border-b border-border p-4 flex items-center justify-between sticky top-0 z-30">
                    <h2 className="font-bold tracking-tight">Admin System</h2>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-700 hover:bg-slate-100 p-2 rounded-md">
                        <Menu size={20} />
                    </button>
                </header>

                <div className="flex-1 overflow-auto p-4 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
