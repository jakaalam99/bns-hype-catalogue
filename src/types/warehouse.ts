export interface WarehouseGroup {
    id: string;
    name: string;
    created_at: string;
}

export interface Warehouse {
    id: string;
    name: string;
    is_visible: boolean;
    group_id?: string;
    created_at: string;
    group?: WarehouseGroup;
}

export interface WarehouseStock {
    id: string;
    product_id: string;
    warehouse_id: string;
    quantity: number;
    updated_at: string;
    warehouse?: Warehouse; // For joining
}
