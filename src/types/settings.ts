export interface SocialLink {
    platform: string;
    url: string;
    is_visible: boolean;
    custom_name?: string;
}

export interface MarketplaceLink {
    platform: string;
    url: string;
    is_visible: boolean;
    custom_name?: string;
}

export interface LinkItem {
    label: string;
    url?: string;
    number?: string; // For WhatsApp
}

export interface StoreSettings {
    id: number;
    about_text: string | null;
    instagram_url: string | null;
    tiktok_url: string | null;
    whatsapp_number: string | null;
    instagram_links: LinkItem[];
    tiktok_links: LinkItem[];
    whatsapp_links: LinkItem[];
    offline_stores: Array<{
        name: string;
        address: string;
        maps_url?: string;
    }>;
    social_links: SocialLink[];
    marketplace_links: MarketplaceLink[];
    hide_out_of_stock: boolean;
    watermark_enabled: boolean;
    watermark_image_url?: string | null;
    watermark_size: number;
    watermark_position: string;
    watermark_opacity: number;
    watermark_padding: number;
    watermark_offset_x: number;
    watermark_offset_y: number;
    favicon_url?: string | null;
    contact_url?: string | null;
    updated_at: string;
}
