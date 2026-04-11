export interface Product {
    id: string;
    sku: string;
    barcode: string | null;
    brand: string | null;
    category: string | null;
    name: string;
    price: number;
    discount_price: number | null;
    is_active: boolean;
    description: string | null;
    created_at: string;
    updated_at: string;
    total_stock?: number;
}

export interface ProductImage {
    id: string;
    product_id: string;
    image_url: string;
    display_order: number;
    created_at: string;
}

export interface ProductWithImages extends Product {
    images: ProductImage[];
    warehouse_stocks?: { quantity: number }[];
}
