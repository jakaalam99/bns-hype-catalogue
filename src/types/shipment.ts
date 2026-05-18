export type ShipmentStatus = 'Upcoming' | 'Arrived' | 'Received';

export interface Shipment {
    id: string;
    name: string;
    status: ShipmentStatus;
    note?: string | null;
    is_fully_launched?: boolean;
    created_at: string;
    updated_at: string;
    created_by?: string;
    items?: { sku: string; name: string; is_fully_launched: boolean }[];
}

export interface ShipmentItem {
    id: string;
    shipment_id: string;
    sku: string;
    name: string;
    barcode: string | null;
    brand: string | null;
    quantity: number;
    qty_in_carton: number;
    ip_name: string | null;
    srp: number;
    image_url: string | null;
    launch_week: string | null;
    is_fully_launched: boolean;
    display_order: number;
    created_at: string;
    is_repeat_order?: boolean;
}

export interface ShipmentStoreAllocation {
    id: string;
    shipment_item_id: string;
    store_name: string;
    quantity: number;
    created_at: string;
    updated_at: string;
}

export interface ShipmentLog {
    id: string;
    shipment_id: string;
    user_id: string;
    user_name: string | null;
    user_role: string | null;
    action: string;
    details: any;
    created_at: string;
}
