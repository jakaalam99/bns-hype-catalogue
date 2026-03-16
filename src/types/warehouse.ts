export interface Warehouse {
    id: string;
    name: string;
    is_visible: boolean;
    created_at: string;
}

export interface WarehouseStock {
    id: string;
    product_id: string;
    warehouse_id: string;
    quantity: number;
    updated_at: string;
    warehouse?: Warehouse; // For joining
}
