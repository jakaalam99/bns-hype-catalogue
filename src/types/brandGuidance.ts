export interface BrandGuidance {
    id: string;
    name: string;
    display_order: number;
    created_at: string;
    files?: BrandGuidanceFile[];
}

export interface BrandGuidanceFile {
    id: string;
    brand_id: string;
    file_name: string;
    file_path: string;
    thumbnail_path?: string;
    display_order: number;
    created_at: string;
}
