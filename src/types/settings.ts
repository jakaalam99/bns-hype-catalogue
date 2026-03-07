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

export interface StoreSettings {
    id: number;
    about_text: string | null;
    instagram_url: string | null;
    tiktok_url: string | null;
    whatsapp_number: string | null;
    offline_stores: Array<{
        name: string;
        address: string;
        maps_url?: string;
    }>;
    social_links: SocialLink[];
    marketplace_links: MarketplaceLink[];
    updated_at: string;
}
