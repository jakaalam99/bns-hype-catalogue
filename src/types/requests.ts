export type RequestStatus = 'Under Review' | 'SJ Creation' | 'Picking' | 'On Delivery' | 'Delivered';

export type UserRole = 
    | 'ADMIN' 
    | 'MD' 
    | 'FINANCE' 
    | 'BELI_PUTUS' 
    | 'ONLINE' 
    | 'CONSIGNMENT' 
    | 'STORE' 
    | 'EXPO' 
    | 'MKT' 
    | 'VM'
    | 'putus'; // Existing role

export interface DestinationLocation {
    id: string;
    name: string;
    created_at: string;
}

export interface InventoryRequest {
    id: string;
    requestor_id: string;
    requestor_role: UserRole;
    status: RequestStatus;
    total_qty: number;
    created_at: string;
    updated_at: string;
    items?: RequestItem[];
}

export interface RequestItem {
    id: string;
    product_id: string;
    request_id: string;
    sku: string;
    product_name: string;
    qty: number;
    destination_location: string;
}

export interface Allocation {
    id: string;
    request_item_id: string;
    warehouse_id: string;
    qty: number;
    warehouse?: {
        name: string;
        category?: {
            name: string;
        };
    };
}

export interface SuratJalan {
    id: string;
    request_id: string;
    sj_number: string;
    created_at: string;
}

export interface WarehouseCategory {
    id: string;
    name: string;
    created_at: string;
}
