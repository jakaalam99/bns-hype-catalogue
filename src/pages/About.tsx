import { useStoreSettings } from '../features/catalogue/StoreSettingsContext';
import { Instagram, MapPin, Store, Link as LinkIcon, ShoppingBag, Music } from 'lucide-react';

export const About = () => {
    const { settings, loading } = useStoreSettings();

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20 text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-12 py-8 animate-fade-in-up">
            {/* Header Section */}
            <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-foreground rounded-2xl mx-auto flex items-center justify-center text-background shadow-premium mb-6">
                    <Store size={32} />
                </div>
                <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-foreground text-balance">
                    About BNS HYPE
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    {settings?.about_text || 'Premium catalogue for discerning customers.'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-border">
                {/* Social Links */}
                <div className="bg-surface rounded-2xl p-6 sm:p-8 shadow-sm border border-border flex flex-col items-center text-center group hover:border-pink-200 transition-colors hover-card">
                    <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Instagram size={24} />
                    </div>
                    <h3 className="font-display font-bold text-foreground text-lg mb-2">Follow Us</h3>
                    <p className="text-muted-foreground text-sm mb-6">Stay updated with our latest drops and content on Instagram.</p>

                    <div className="w-full space-y-2 mt-auto">
                        {settings?.instagram_links && settings.instagram_links.length > 0 ? (
                            settings.instagram_links.map((link, idx) => (
                                <a
                                    key={idx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-xl font-medium text-sm hover:bg-zinc-800 transition-colors w-full hover:shadow-md"
                                >
                                    <Instagram size={14} />
                                    {link.label || '@bnshype'}
                                </a>
                            ))
                        ) : (
                            <span className="text-sm font-medium text-slate-400">Links coming soon</span>
                        )}
                    </div>
                </div>

                {/* WhatsApp Contact */}
                <div className="bg-surface rounded-2xl p-6 sm:p-8 shadow-sm border border-border flex flex-col items-center text-center group hover:border-emerald-200 transition-colors hover-card">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                    </div>
                    <h3 className="font-display font-bold text-foreground text-lg mb-2">WhatsApp</h3>
                    <p className="text-muted-foreground text-sm mb-6">Have questions or want to make a purchase? Reach out to our team directly.</p>

                    <div className="w-full space-y-2 mt-auto">
                        {settings?.whatsapp_links && settings.whatsapp_links.length > 0 ? (
                            settings.whatsapp_links.map((link, idx) => (
                                <a
                                    key={idx}
                                    href={`https://wa.me/${link.number?.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-xl font-medium text-sm hover:bg-zinc-800 transition-colors w-full hover:shadow-md"
                                >
                                    Chat: {link.label || 'Contact Us'}
                                </a>
                            ))
                        ) : (
                            <span className="text-sm font-medium text-slate-400">Numbers coming soon</span>
                        )}
                    </div>
                </div>

                {/* TikTok Card */}
                <div className="bg-surface rounded-2xl p-6 sm:p-8 shadow-sm border border-border flex flex-col items-center text-center group hover:border-cyan-200 transition-colors hover-card">
                    <div className="w-12 h-12 bg-zinc-900 text-white rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.59-1.01V15.5c0 1.28-.18 2.56-.7 3.71-.9 2.02-2.91 3.49-5.12 3.73-2.25.27-4.64-.51-6.04-2.32-1.28-1.61-1.59-3.87-.83-5.78.8-2.01 2.87-3.4 5.01-3.66.19-.03.38-.04.58-.04v4.05c-1.1.09-2.18.59-2.76 1.52-.58.91-.65 2.1-.19 3.03.46.99 1.48 1.68 2.58 1.7.53.01 1.05-.1 1.53-.32.74-.33 1.23-1.01 1.34-1.8.04-.26.04-.52.04-.78V.02z" />
                        </svg>
                    </div>
                    <h3 className="font-display font-bold text-foreground text-lg mb-2">TikTok</h3>
                    <p className="text-muted-foreground text-sm mb-6">Experience our products in motion. Get exclusive looks at our latest stock.</p>

                    <div className="w-full space-y-2 mt-auto">
                        {settings?.tiktok_links && settings.tiktok_links.length > 0 ? (
                            settings.tiktok_links.map((link, idx) => (
                                <a
                                    key={idx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-xl font-medium text-sm hover:bg-zinc-800 transition-colors w-full hover:shadow-md"
                                >
                                    <Music size={14} />
                                    {link.label || '@bnshype'}
                                </a>
                            ))
                        ) : (
                            <span className="text-sm font-medium text-slate-400">Links coming soon</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Dynamic Social Links */}
            {settings?.social_links && settings.social_links.filter((s: any) => s.is_visible).length > 0 && (
                <div className="pt-8 border-t border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight text-center mb-6">More Ways to Connect</h2>
                    <div className="flex flex-wrap justify-center gap-4">
                        {settings.social_links.filter((s: any) => s.is_visible).map((link: any, idx: number) => (
                            <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-5 py-2.5 bg-white border border-slate-200 hover:border-pink-300 rounded-xl shadow-sm hover:shadow-md transition-all font-medium text-slate-700 flex items-center gap-2 group hover:text-pink-600"
                            >
                                <LinkIcon size={16} className="text-slate-400 group-hover:text-pink-500 transition-colors" />
                                {link.platform === 'Custom' ? (link.custom_name || 'Link') : link.platform}
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Marketplace Links */}
            {settings?.marketplace_links && settings.marketplace_links.filter((s: any) => s.is_visible).length > 0 && (
                <div className="pt-8 border-t border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight text-center mb-6">Available on Marketplaces</h2>
                    <div className="flex flex-wrap justify-center gap-4">
                        {settings.marketplace_links.filter((s: any) => s.is_visible).map((link: any, idx: number) => (
                            <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-5 py-2.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl shadow-sm hover:shadow-md transition-all font-medium text-slate-700 flex items-center gap-2 group hover:text-orange-600"
                            >
                                <ShoppingBag size={16} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
                                {link.platform === 'Other' ? (link.custom_name || 'Store') : link.platform}
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Offline Stores Section */}
            {settings?.offline_stores && settings.offline_stores.length > 0 && (
                <div className="pt-8 border-t border-border">
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <MapPin className="text-foreground" size={24} />
                        <h2 className="text-2xl font-display font-bold text-foreground tracking-tight">Visit Our Stores</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {settings.offline_stores.map((store: any, index: number) => (
                            <div key={index} className="bg-surface p-6 rounded-2xl shadow-sm border border-border flex flex-col transition-all hover-card">
                                <h3 className="font-display font-bold text-foreground text-lg mb-2">{store.name}</h3>
                                <p className="text-muted-foreground text-sm mb-6 leading-relaxed flex-1">
                                    {store.address}
                                </p>
                                {store.maps_url && (
                                    <a
                                        href={store.maps_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-zinc-600 transition-colors"
                                    >
                                        <MapPin size={16} />
                                        Get Directions
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
