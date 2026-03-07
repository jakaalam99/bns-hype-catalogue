import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BackgroundParticles } from '../components/BackgroundParticles';
import { FileText, Download, Tag, Loader2, ExternalLink } from 'lucide-react';
import type { BrandGuidance as BrandGuidanceType } from '../types/brandGuidance';

export const BrandGuidance = () => {
    const [brands, setBrands] = useState<BrandGuidanceType[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string | null>(null);

    useEffect(() => {
        const fetchBrandGuidance = async () => {
            try {
                const { data, error } = await supabase
                    .from('brand_guidance')
                    .select('*, files:brand_guidance_files(*)')
                    .order('display_order', { ascending: true });

                if (error) throw error;
                if (data) {
                    setBrands(data);
                    if (data.length > 0) {
                        setActiveTab(data[0].id);
                    }
                }
            } catch (error) {
                console.error('Error fetching brand guidance:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBrandGuidance();
    }, []);

    const activeBrand = brands.find(b => b.id === activeTab);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="animate-spin text-foreground" size={48} />
            </div>
        );
    }

    return (
        <div className="relative min-h-screen animate-fade-in">
            <BackgroundParticles />

            <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-foreground rounded-xl flex items-center justify-center text-background shadow-lg">
                            <Tag size={20} />
                        </div>
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-[0.3em]">Resources</span>
                    </div>
                    <h1 className="text-5xl font-display font-black text-foreground uppercase tracking-tighter mb-4">
                        Brand <span className="italic">Guidance</span>
                    </h1>
                    <p className="text-zinc-500 text-lg max-w-2xl font-medium leading-relaxed">
                        Access official branding materials and guidelines for each of our featured brands.
                    </p>
                </div>

                {brands.length === 0 ? (
                    <div className="glass rounded-[2rem] p-12 text-center border border-border">
                        <FileText size={48} className="mx-auto text-zinc-300 mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">No Guidance Materials Available</h3>
                        <p className="text-zinc-500">Check back later for official documentation.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
                        {/* Tabs Sidebar */}
                        <div className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 scrollbar-none">
                            {brands.map((brand) => (
                                <button
                                    key={brand.id}
                                    onClick={() => setActiveTab(brand.id)}
                                    className={`flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all uppercase tracking-widest border ${activeTab === brand.id
                                        ? 'bg-foreground text-background border-foreground shadow-premium'
                                        : 'bg-surface/50 text-zinc-500 border-border hover:border-zinc-400 hover:text-foreground'
                                        }`}
                                >
                                    {brand.name}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="glass rounded-[2rem] border border-border p-8 min-h-[500px]">
                            {activeBrand && (
                                <div className="space-y-8 animate-fade-in-up">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                                        <div>
                                            <h2 className="text-2xl font-display font-bold text-foreground uppercase tracking-tight">{activeBrand.name} Documentation</h2>
                                            <p className="text-zinc-500 text-sm mt-1">{activeBrand.files?.length || 0} files available</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {activeBrand.files && activeBrand.files.length > 0 ? (
                                            activeBrand.files.sort((a, b) => a.display_order - b.display_order).map((file) => (
                                                <div
                                                    key={file.id}
                                                    className="group flex flex-col p-6 rounded-2xl bg-surface/50 border border-border hover:border-zinc-400 transition-all hover:translate-y-[-2px] hover:shadow-lg"
                                                >
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="w-full h-32 bg-zinc-100 rounded-xl overflow-hidden border border-border flex items-center justify-center text-zinc-400 group-hover:border-blue-400 transition-colors relative">
                                                            {file.thumbnail_path ? (
                                                                <img
                                                                    src={supabase.storage.from('brand-guidance').getPublicUrl(file.thumbnail_path).data.publicUrl}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <FileText size={32} />
                                                            )}
                                                            <a
                                                                href={supabase.storage.from('brand-guidance').getPublicUrl(file.file_path).data.publicUrl}
                                                                download={file.file_name}
                                                                className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-lg text-blue-600 hover:text-black transition-colors shadow-sm"
                                                                title="Download File"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <Download size={18} />
                                                            </a>
                                                        </div>
                                                    </div>
                                                    <h4 className="font-bold text-foreground mb-4 line-clamp-2">{file.file_name}</h4>
                                                    <a
                                                        href={supabase.storage.from('brand-guidance').getPublicUrl(file.file_path).data.publicUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-auto flex items-center justify-center gap-2 w-full py-3 bg-foreground text-background text-xs font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-colors"
                                                    >
                                                        View Document
                                                        <ExternalLink size={14} />
                                                    </a>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-24 text-center">
                                                <p className="text-zinc-400 font-medium italic">No files uploaded for this brand yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
