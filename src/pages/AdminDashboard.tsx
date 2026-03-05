import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Package, Tag, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import { formatIDR } from '../lib/utils';
import type { Product } from '../types/product';
import type { Program } from '../types/program';

export const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSKUs: 0,
        activePrograms: 0,
        skusInPrograms: 0,
        averagePrice: 0,
        averageDiscountedPrice: 0,
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch Products
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('sku, price, discount_price');

            if (productsError) throw productsError;

            // Fetch Programs
            const { data: programsData, error: programsError } = await supabase
                .from('programs')
                .select('*')
                .eq('is_active', true);

            if (programsError) throw programsError;

            const products = productsData as Pick<Product, 'sku' | 'price' | 'discount_price'>[];
            const programs = programsData as Program[];

            const totalSKUs = products.length;
            const activePrograms = programs.length;

            // Calculate SKUs in programs (unique set of SKUs)
            const skusInProgramsSet = new Set<string>();
            programs.forEach(prog => {
                if (prog.skus) {
                    prog.skus.forEach(sku => skusInProgramsSet.add(sku));
                }
            });
            const skusInPrograms = skusInProgramsSet.size;

            // Calculate Averages
            let sumPrice = 0;
            let sumDiscountedPrice = 0;

            products.forEach(p => {
                sumPrice += p.price;
                sumDiscountedPrice += p.discount_price !== null ? p.discount_price : p.price;
            });

            const averagePrice = totalSKUs > 0 ? sumPrice / totalSKUs : 0;
            const averageDiscountedPrice = totalSKUs > 0 ? sumDiscountedPrice / totalSKUs : 0;

            setStats({
                totalSKUs,
                activePrograms,
                skusInPrograms,
                averagePrice,
                averageDiscountedPrice
            });

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                <p className="text-slate-500 font-medium tracking-tight">Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
                <p className="text-sm text-slate-500">Key performance indicators and catalogue statistics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total SKUs */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Package size={20} />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Total SKUs</p>
                        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{stats.totalSKUs}</h3>
                    </div>
                </div>

                {/* SKUs tied to Programs */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center">
                            <Tag size={20} />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">SKUs in Active Programs</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{stats.skusInPrograms}</h3>
                            <span className="text-xs font-semibold text-slate-400 uppercase">of {stats.totalSKUs}</span>
                        </div>
                    </div>
                </div>

                {/* Active Programs */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Active Programs</p>
                        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{stats.activePrograms}</h3>
                    </div>
                </div>

                {/* Average Price */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Avg. Final Price</p>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">{formatIDR(stats.averageDiscountedPrice)}</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4 tracking-tight">Quick Actions</h3>
                    <p className="text-sm text-slate-500 mb-6">Manage your core catalogue functions directly from here.</p>
                    <div className="flex gap-4">
                        <Link to="/admin/products" className="flex-1 py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm rounded-lg text-center transition-colors">Manage Products</Link>
                        <Link to="/admin/programs" className="flex-1 py-2 px-4 bg-pink-50 hover:bg-pink-100 text-pink-700 font-semibold text-sm rounded-lg text-center transition-colors">Manage Programs</Link>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-sm text-slate-500">More analytics coming soon.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
