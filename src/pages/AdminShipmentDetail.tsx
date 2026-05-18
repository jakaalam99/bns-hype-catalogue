import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../features/auth/useAuthStore';
import { hasDashboardAccess } from '../features/auth/roleUtils';
import { 
    Loader2, ArrowLeft, Plus, Save, History, Truck, 
    Package, AlertCircle, CheckCircle2, Trash2, Edit2, Check, Clock, Search,
    FileDown, RotateCcw, ZoomIn, FileSpreadsheet, ChevronUp, ChevronDown,
    ArrowUpDown
} from 'lucide-react';
import type { Shipment, ShipmentItem, ShipmentStoreAllocation, ShipmentLog, ShipmentStatus } from '../types/shipment';
import { AdminShipmentItemModal } from '../components/admin/AdminShipmentItemModal';
import { AdminShipmentImportModal } from '../components/admin/AdminShipmentImportModal';
import { AdminShipmentSortModal } from '../components/admin/AdminShipmentSortModal';
import { Skeleton } from '../components/common/Skeleton';
import { FullscreenGallery } from '../components/common/FullscreenGallery';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const AdminShipmentDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const role = user?.user_metadata?.role?.toUpperCase() || '';
    const isMD = hasDashboardAccess(role);

    const [shipment, setShipment] = useState<Shipment | null>(null);
    const [items, setItems] = useState<ShipmentItem[]>([]);
    const [allocations, setAllocations] = useState<Record<string, number>>({}); // { "itemId:storeName": qty }
    const [stores, setStores] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [logs, setLogs] = useState<ShipmentLog[]>([]);
    const [storeOrdersCount, setStoreOrdersCount] = useState<Record<string, Record<string, number>>>({}); // {sku: {storeId: totalOrdered}}
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSortModalOpen, setIsSortModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ShipmentItem | null>(null);
    const [activeTab, setActiveTab] = useState<'items' | 'logs'>('items');
    
    // Filters
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [brandFilter, setBrandFilter] = useState('All');
    const [ipFilter, setIpFilter] = useState('All');
    const [weekFilter, setWeekFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [launchFilter, setLaunchFilter] = useState('All');
    const [selectedStoreGroupId, setSelectedStoreGroupId] = useState<string>('All');

    const [originalAllocations, setOriginalAllocations] = useState<Record<string, number>>({});
    const [previewImage, setPreviewImage] = useState<{ url: string, title: string, allImages?: string[] } | null>(null);

    useEffect(() => {
        const handler = setTimeout(() => {
            setSearch(searchInput);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchInput]);

    const logAction = useCallback(async (action: string, details: any) => {
        if (!id) return;
        await supabase.from('shipment_logs').insert([{
            shipment_id: id,
            user_id: user?.id,
            user_name: user?.user_metadata?.full_name || user?.email,
            user_role: role,
            action,
            details
        }]);
    }, [id, user, role]);

    const brandOptions = ['All', ...new Set(items.filter(i => {
        const matchesSearch = i.name?.toLowerCase().includes(search.toLowerCase()) || i.sku?.toLowerCase().includes(search.toLowerCase());
        const matchesWeek = weekFilter === 'All' || i.launch_week === weekFilter;
        const matchesType = typeFilter === 'All' || (typeFilter === 'New Item' && !i.is_repeat_order) || (typeFilter === 'Repeat Order' && i.is_repeat_order);
        return matchesSearch && matchesWeek && matchesType;
    }).map(i => i.brand || 'Unknown').filter(Boolean))].sort();

    const ipOptions = ['All', ...new Set(items.filter(i => {
        const matchesSearch = i.name?.toLowerCase().includes(search.toLowerCase()) || i.sku?.toLowerCase().includes(search.toLowerCase());
        const matchesBrand = brandFilter === 'All' || i.brand === brandFilter;
        const matchesWeek = weekFilter === 'All' || i.launch_week === weekFilter;
        const matchesType = typeFilter === 'All' || (typeFilter === 'New Item' && !i.is_repeat_order) || (typeFilter === 'Repeat Order' && i.is_repeat_order);
        return matchesSearch && matchesBrand && matchesWeek && matchesType;
    }).map(i => i.ip_name).filter(Boolean))].sort();

    const weekOptions = useMemo(() => {
        return ['All', ...new Set(items.map(i => i.launch_week).filter(Boolean))].sort();
    }, [items]);

    const filteredStores = useMemo(() => {
        if (selectedStoreGroupId === 'All') return stores;
        if (selectedStoreGroupId === 'None') return stores.filter(s => !s.group_id);
        return stores.filter(s => s.group_id === selectedStoreGroupId);
    }, [stores, selectedStoreGroupId]);

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name?.toLowerCase().includes(search.toLowerCase()) || 
                             item.sku?.toLowerCase().includes(search.toLowerCase());
        const matchesBrand = brandFilter === 'All' || item.brand === brandFilter;
        const matchesIp = ipFilter === 'All' || item.ip_name === ipFilter;
        const matchesWeek = weekFilter === 'All' || item.launch_week === weekFilter;
        const matchesType = typeFilter === 'All' || 
                           (typeFilter === 'New Item' && !item.is_repeat_order) ||
                           (typeFilter === 'Repeat Order' && item.is_repeat_order);
        const matchesLaunch = launchFilter === 'All' || 
                             (launchFilter === 'Fully Launched' && item.is_fully_launched) ||
                             (launchFilter === 'In Progress' && !item.is_fully_launched);
        
        return matchesSearch && matchesBrand && matchesIp && matchesWeek && matchesType && matchesLaunch;
    });

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Shipment
            const { data: shipData, error: shipError } = await supabase
                .from('shipments')
                .select('*')
                .eq('id', id)
                .single();
            if (shipError) throw shipError;
            setShipment(shipData);

            // 2. Fetch Groups & Stores
            const { data: groupData } = await supabase.from('destination_groups').select('*').order('name');
            setGroups(groupData || []);

            const { data: storeData, error: storeError } = await supabase
                .from('destination_locations')
                .select('*')
                .order('name');
            if (storeError) throw storeError;
            setStores(storeData || []);

            // 3. Fetch Items
            const { data: itemData, error: itemError } = await supabase
                .from('shipment_items')
                .select('*')
                .eq('shipment_id', id)
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: true });
            if (itemError) throw itemError;

            // 4. Fetch Allocations
            const { data: allocData, error: allocError } = await supabase
                .from('shipment_store_allocations')
                .select('*')
                .in('shipment_item_id', itemData?.map(i => i.id) || []);
            if (allocError) throw allocError;

            const skus = itemData?.map(i => i.sku) || [];
            if (skus.length > 0) {
                const { data: existingProducts } = await supabase
                    .from('products')
                    .select(`
                        sku,
                        images:product_images(image_url, display_order)
                    `)
                    .in('sku', skus);
                
                const productMap = new Map(existingProducts?.map(p => {
                    const sortedImages = p.images?.sort((a: any, b: any) => a.display_order - b.display_order) || [];
                    const firstImage = sortedImages[0]?.image_url;
                    const publicUrl = firstImage ? supabase.storage.from('product-images').getPublicUrl(firstImage).data.publicUrl : null;
                    return [p.sku.toLowerCase(), { exists: true, imageUrl: publicUrl }];
                }));

                const itemsWithStatus = itemData?.map(item => {
                    const catalogueProduct = productMap.get(item.sku.toLowerCase());
                    return {
                        ...item,
                        is_repeat_order: !!catalogueProduct?.exists,
                        // Use catalogue image if available, otherwise fallback to item's own image
                        image_url: catalogueProduct?.imageUrl || item.image_url
                    };
                });
                setItems(itemsWithStatus || []);
            } else {
                setItems(itemData || []);
            }
            
            const allocMap: Record<string, number> = {};
            allocData?.forEach(a => {
                allocMap[`${a.shipment_item_id}:${a.store_name}`] = a.quantity;
            });
            setAllocations(allocMap);
            setOriginalAllocations({ ...allocMap });

            const { data: logData, error: logError } = await supabase
                .from('shipment_logs')
                .select('*')
                .eq('shipment_id', id)
                .order('created_at', { ascending: false });
            if (logError) throw logError;
            setLogs(logData || []);

            // 5. Fetch Store Orders for these SKUs to calculate Remaining Quota
            if (skus.length > 0) {
                const { data: orderData, error: orderError } = await supabase
                    .from('store_order_items')
                    .select(`
                        quantity,
                        product:products!inner(sku),
                        order:store_orders!inner(store_id, status)
                    `)
                    .in('product.sku', skus);
                
                if (!orderError && orderData) {
                    const oMap: Record<string, Record<string, number>> = {};
                    orderData.forEach((item: any) => {
                        // Only count confirmed/approved orders? For now, let's count everything that isn't 'Rejected'
                        if (item.order.status === 'Rejected') return;
                        
                        const sku = item.product.sku;
                        const storeId = item.order.store_id;
                        if (!oMap[sku]) oMap[sku] = {};
                        oMap[sku][storeId] = (oMap[sku][storeId] || 0) + item.quantity;
                    });
                    setStoreOrdersCount(oMap);
                }
            }

        } catch (err: any) {
            console.error('Error fetching shipment data:', err);
            setError(err.message || 'Failed to load shipment details.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleExportExcel = async () => {
        if (!shipment || !items.length) return;
        setSaving(true);

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Shipment Details');

            // Define columns
            const columns = [
                { header: 'Image', key: 'image', width: 15 },
                { header: 'SKU', key: 'sku', width: 20 },
                { header: 'Barcode', key: 'barcode', width: 20 },
                { header: 'Product Name', key: 'name', width: 40 },
                { header: 'Brand', key: 'brand', width: 15 },
                { header: 'IP Name', key: 'ip_name', width: 15 },
                { header: 'SRP', key: 'srp', width: 15 },
                { header: 'Total Qty', key: 'quantity', width: 12 },
                { header: 'Carton Qty', key: 'qty_in_carton', width: 12 },
                { header: 'Week', key: 'launch_week', width: 15 },
                { header: 'Launched', key: 'is_fully_launched', width: 12 },
                { header: 'Total Allocated', key: 'total_allocated', width: 15 },
                { header: 'Remaining', key: 'remaining', width: 15 },
            ];

            // Add store columns
            stores.forEach(store => {
                columns.push({ header: store.name, key: `store_${store.name}`, width: 15 });
            });

            worksheet.columns = columns;

            // Add rows
            for (let i = 0; i < filteredItems.length; i++) {
                const item = filteredItems[i];
                const totalAlloc = stores.reduce((sum, s) => sum + (allocations[`${item.id}:${s.name}`] || 0), 0);
                const remaining = item.quantity - totalAlloc;

                const rowData: any = {
                    sku: item.sku,
                    barcode: item.barcode || '',
                    name: item.name,
                    brand: item.brand || '',
                    ip_name: item.ip_name || '',
                    srp: item.srp,
                    quantity: item.quantity,
                    qty_in_carton: item.qty_in_carton || 0,
                    launch_week: item.launch_week || '',
                    is_fully_launched: item.is_fully_launched ? 'YES' : 'NO',
                    total_allocated: totalAlloc,
                    remaining: remaining
                };

                stores.forEach(store => {
                    rowData[`store_${store.name}`] = allocations[`${item.id}:${store.name}`] || 0;
                });

                const row = worksheet.addRow(rowData);
                row.height = 60; // Set height for images
                row.alignment = { vertical: 'middle', horizontal: 'center' };

                // Add image if exists
                if (item.image_url) {
                    try {
                        const response = await fetch(item.image_url);
                        const buffer = await response.arrayBuffer();
                        const imageId = workbook.addImage({
                            buffer: buffer,
                            extension: 'png', // Most likely png or jpeg
                        });

                        worksheet.addImage(imageId, {
                            tl: { col: 0, row: row.number - 1 },
                            ext: { width: 80, height: 80 },
                            editAs: 'oneCell'
                        });
                    } catch (err) {
                        console.warn('Failed to embed image for SKU:', item.sku);
                    }
                }
            }

            // Styling header
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const filename = `Shipment_${shipment.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
            saveAs(blob, filename);

        } catch (err: any) {
            console.error('Export error:', err);
            alert('Failed to export excel: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateStatus = async (newStatus: ShipmentStatus) => {
        if (!shipment) return;
        try {
            const { error } = await supabase
                .from('shipments')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', shipment.id);
            if (error) throw error;
            
            await logAction('Update Status', { old: shipment.status, new: newStatus });
            
            setShipment({ ...shipment, status: newStatus });
        } catch (err: any) {
            alert('Failed to update status: ' + err.message);
        }
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setSearch('');
        setBrandFilter('All');
        setIpFilter('All');
        setWeekFilter('All');
        setTypeFilter('All');
        setLaunchFilter('All');
    };

    const handleUpdateAllocation = useCallback((itemId: string, storeName: string, value: string) => {
        const qty = parseInt(value) || 0;
        setAllocations(prev => ({
            ...prev,
            [`${itemId}:${storeName}`]: qty
        }));
    }, []);

    const handleSaveAllocations = useCallback(async () => {
        setSaving(true);
        try {
            const upsertData: any[] = [];
            for (const [key, quantity] of Object.entries(allocations)) {
                const [itemId, storeName] = key.split(':');
                upsertData.push({ shipment_item_id: itemId, store_name: storeName, quantity });
            }

            const { error } = await supabase.from('shipment_store_allocations').upsert(upsertData, { onConflict: 'shipment_item_id,store_name' });
            if (error) throw error;

            const itemChanges: string[] = [];
            items.forEach(item => {
                const itemDiffs: string[] = [];
                stores.forEach(store => {
                    const key = `${item.id}:${store.name}`;
                    const oldVal = originalAllocations[key] || 0;
                    const newVal = allocations[key] || 0;
                    if (oldVal !== newVal) {
                        itemDiffs.push(`${store.name}: ${oldVal} → ${newVal}`);
                    }
                });
                if (itemDiffs.length > 0) {
                    itemChanges.push(`${item.name} (${item.sku}): ${itemDiffs.join(', ')}`);
                }
            });

            if (itemChanges.length > 0) {
                await logAction('Update Store Allocations', { changes: itemChanges });
            }
            
            alert('Allocations saved successfully!');
            fetchData();
        } catch (err: any) {
            alert('Failed to save allocations: ' + err.message);
        } finally {
            setSaving(false);
        }
    }, [allocations, originalAllocations, items, stores, logAction, fetchData]);

    const handleDeleteItem = useCallback(async (itemId: string) => {
        if (!confirm('Are you sure you want to remove this product from the shipment?')) return;
        try {
            const itemToDelete = items.find(i => i.id === itemId);
            const { error } = await supabase.from('shipment_items').delete().eq('id', itemId);
            if (error) throw error;
            await logAction('Remove Product', { 
                sku: itemToDelete?.sku, 
                name: itemToDelete?.name,
                reason: 'Manual deletion'
            });
            fetchData();
        } catch (err: any) {
            alert('Failed to delete item: ' + err.message);
        }
    }, [items, logAction, fetchData]);

    const handleToggleLaunch = useCallback(async (item: ShipmentItem) => {
        if (!isMD) return;
        try {
            const newVal = !item.is_fully_launched;
            const { error } = await supabase
                .from('shipment_items')
                .update({ is_fully_launched: newVal })
                .eq('id', item.id);
            if (error) throw error;
            
            await logAction('Toggle Launch Status', { sku: item.sku, fullyLaunched: newVal });
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_fully_launched: newVal } : i));
        } catch (err: any) {
            alert('Failed to update launch status: ' + err.message);
        }
    }, [isMD, logAction]);

    const handleUpdateLaunchWeek = useCallback(async (item: ShipmentItem, weekText: string) => {
        try {
            const { error } = await supabase
                .from('shipment_items')
                .update({ launch_week: weekText })
                .eq('id', item.id);
            if (error) throw error;
            
            await logAction('Update Launch Week', { sku: item.sku, week: weekText });
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, launch_week: weekText } : i));
        } catch (err: any) {
            alert('Failed to update week: ' + err.message);
        }
    }, [logAction]);

    const handleMoveItem = useCallback(async (index: number, direction: 'up' | 'down') => {
        if (!isMD) return;
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= filteredItems.length) return;

        const itemA = filteredItems[index];
        const itemB = filteredItems[newIndex];

        let orderA = itemA.display_order;
        let orderB = itemB.display_order;

        if (orderA === orderB) {
            const updates = items.map((item, idx) => ({
                id: item.id,
                shipment_id: item.shipment_id,
                sku: item.sku,
                name: item.name,
                quantity: item.quantity,
                srp: item.srp,
                display_order: idx * 10
            }));
            
            const { error: reindexError } = await supabase.from('shipment_items').upsert(updates, { onConflict: 'id' });
            if (reindexError) {
                alert('Failed to initialize sort order: ' + reindexError.message);
                return;
            }
            await fetchData();
            return;
        }

        try {
            const { error } = await supabase.from('shipment_items').upsert([
                { id: itemA.id, shipment_id: itemA.shipment_id, sku: itemA.sku, name: itemA.name, quantity: itemA.quantity, srp: itemA.srp, display_order: orderB },
                { id: itemB.id, shipment_id: itemB.shipment_id, sku: itemB.sku, name: itemB.name, quantity: itemB.quantity, srp: itemB.srp, display_order: orderA }
            ], { onConflict: 'id' });

            if (error) throw error;
            
            setItems(prev => {
                const updatedItems = [...prev];
                const idxA = updatedItems.findIndex(i => i.id === itemA.id);
                const idxB = updatedItems.findIndex(i => i.id === itemB.id);
                updatedItems[idxA].display_order = orderB;
                updatedItems[idxB].display_order = orderA;
                
                updatedItems.sort((a, b) => (a.display_order - b.display_order) || (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
                return updatedItems;
            });
            
        } catch (err: any) {
            alert('Failed to update order: ' + err.message);
        }
    }, [isMD, filteredItems, items, fetchData]);

    const formatLogDetails = (log: ShipmentLog) => {
        if (!log.details) return null;
        const d = log.details;
        
        switch (log.action) {
            case 'Update Store Allocations':
                if (d.changes && Array.isArray(d.changes)) {
                    return (
                        <ul className="list-disc pl-4 space-y-1">
                            {d.changes.map((c: string, idx: number) => <li key={idx}>{c}</li>)}
                        </ul>
                    );
                }
                return d.summary || 'Updated product allocations for stores.';
            case 'Remove Product':
                return `Removed ${d.name} (${d.sku}) from this shipment.`;
            case 'Toggle Launch Status':
                return `${d.fullyLaunched ? 'Marked' : 'Unmarked'} product ${d.sku} as fully launched.`;
            case 'Update Launch Week':
                return `Updated launch week for ${d.sku} to "${d.week || 'None'}"`;
            case 'Add Item':
                return `Added product ${d.name} (${d.sku}) with total quantity ${d.quantity}.`;
            case 'Update Item':
                return (
                    <div>
                        <p className="font-bold mb-1">Updated {d.name} ({d.sku}):</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                            {d.diffs?.map((df: string, idx: number) => <li key={idx}>{df}</li>)}
                        </ul>
                    </div>
                );
            case 'Bulk Import':
                return d.summary || `Imported ${d.count} products via Excel.`;
            default:
                return typeof d === 'object' ? JSON.stringify(d) : String(d);
        }
    };
    const handleShowAllImages = useCallback(async (item: ShipmentItem) => {
        // Set initial thumbnail immediately for responsiveness
        setPreviewImage({ url: item.image_url || '', title: item.name });

        if (!item.sku) return;

        try {
            // Fetch product and its images by SKU
            const { data: productData, error: productError } = await supabase
                .from('products')
                .select(`
                    id,
                    images:product_images(image_url, display_order)
                `)
                .eq('sku', item.sku)
                .maybeSingle();

            if (productError) throw productError;
            
            if (productData?.images) {
                const sortedImages = productData.images
                    .sort((a: any, b: any) => a.display_order - b.display_order)
                    .map((img: any) => supabase.storage.from('product-images').getPublicUrl(img.image_url).data.publicUrl);
                
                if (sortedImages.length > 0) {
                    setPreviewImage({ 
                        url: sortedImages[0], 
                        title: item.name, 
                        allImages: sortedImages 
                    });
                }
            }
        } catch (err) {
            console.error("Error fetching all images:", err);
            // Fallback to just the shipment item thumbnail already set
        }
    }, []);
    if (loading) {
        return (
            <div className="space-y-6 max-w-[1600px] mx-auto pb-32">
                <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="h-10 w-24 rounded-xl" />
                    <Skeleton className="h-10 w-48 rounded-xl" />
                </div>
                <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm flex justify-between items-start">
                    <div className="space-y-4 w-1/3">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                    <Skeleton className="h-10 w-32 rounded-xl" />
                </div>
                <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm space-y-4">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!shipment) {
        return (
            <div className="p-20 text-center">
                <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                <h2 className="text-xl font-bold text-slate-900">Shipment not found</h2>
                <button onClick={() => navigate('/admin/shipments')} className="mt-4 text-indigo-600 font-bold hover:underline">
                    Back to shipments
                </button>
            </div>
        );
    }

    const isFullyLaunched = items.length > 0 && items.every(i => i.is_fully_launched);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <button onClick={() => navigate('/admin/shipments')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors w-fit font-medium">
                    <ArrowLeft size={18} />
                    Back to Shipments
                </button>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                            <Truck size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{shipment.name}</h1>
                            <p className="text-xs text-slate-500 font-mono">ID: {shipment.id}</p>
                        </div>
                        {isFullyLaunched ? (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 flex items-center gap-1">
                                <CheckCircle2 size={12} /> Fully Launched
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-100 flex items-center gap-1">
                                <Clock size={12} /> Partial Launch
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isMD && (
                            <select 
                                value={shipment.status} 
                                onChange={(e) => handleUpdateStatus(e.target.value as ShipmentStatus)}
                                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="Upcoming">Upcoming</option>
                                <option value="Arrived">Arrived</option>
                                <option value="Received">Received</option>
                            </select>
                        )}
                        {!isMD && (
                            <span className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">
                                {shipment.status}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('items')}
                    className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'items' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <Package size={18} /> Products & Allocations
                    </div>
                </button>
                <button 
                    onClick={() => setActiveTab('logs')}
                    className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'logs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <History size={18} /> Change Log
                    </div>
                </button>
            </div>

            {activeTab === 'items' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex-1 w-full md:max-w-md relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search size={16} className="text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by SKU or Name..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {isMD && (
                                    <>
                                        <button
                                            onClick={handleExportExcel}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-all shadow-sm border border-emerald-100"
                                        >
                                            <FileSpreadsheet size={18} /> Export Excel
                                        </button>
                                        <button
                                            onClick={() => setIsImportModalOpen(true)}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                                        >
                                            <FileDown size={18} /> Import Excel
                                        </button>
                                        <button
                                            onClick={() => setIsSortModalOpen(true)}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-amber-700 font-bold rounded-xl hover:bg-amber-50 transition-all shadow-sm"
                                        >
                                            <ArrowUpDown size={18} /> Bulk Re-order
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingItem(null);
                                                setIsItemModalOpen(true);
                                            }}
                                            className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
                                        >
                                            <Plus size={18} /> Add Product
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={handleSaveAllocations}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                                >
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Save Allocations
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand</span>
                                <select 
                                    value={brandFilter} 
                                    onChange={(e) => setBrandFilter(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                >
                                    {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IP Name</span>
                                <select 
                                    value={ipFilter} 
                                    onChange={(e) => setIpFilter(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                >
                                    {ipOptions.map(ip => <option key={ip || ''} value={ip || ''}>{ip || 'None'}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Launch Week</span>
                                <select 
                                    value={weekFilter} 
                                    onChange={(e) => setWeekFilter(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                >
                                    {weekOptions.map(w => <option key={w || ''} value={w || ''}>{w || 'None'}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</span>
                                <select 
                                    value={typeFilter} 
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                >
                                    <option value="All">All Types</option>
                                    <option value="New Item">New Item</option>
                                    <option value="Repeat Order">Repeat Order</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Launch</span>
                                <select 
                                    value={launchFilter} 
                                    onChange={(e) => setLaunchFilter(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                >
                                    <option value="All">All</option>
                                    <option value="Fully Launched">Fully Launched</option>
                                    <option value="In Progress">In Progress</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 border-l border-slate-200 pl-3 ml-2">
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Show Stores:</span>
                                <select 
                                    value={selectedStoreGroupId} 
                                    onChange={(e) => setSelectedStoreGroupId(e.target.value)}
                                    className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                >
                                    <option value="All">All Stores</option>
                                    <option value="None">No Group</option>
                                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            
                            {(search || brandFilter !== 'All' || ipFilter !== 'All' || weekFilter !== 'All' || typeFilter !== 'All' || launchFilter !== 'All' || selectedStoreGroupId !== 'All') && (
                                <button
                                    onClick={() => {
                                        handleClearFilters();
                                        setSelectedStoreGroupId('All');
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                                >
                                    <RotateCcw size={12} /> Clear Filters
                                </button>
                            )}

                            <div className="ml-auto text-[10px] font-bold text-slate-400 italic">
                                Showing {filteredItems.length} of {items.length} products
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1200px]">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                                        {isMD && (
                                            <th className="px-6 py-4 text-center sticky left-0 bg-slate-50 z-30 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                Action
                                            </th>
                                        )}
                                        <th className="px-6 py-4 text-center sticky left-[88px] bg-slate-50 z-20 border-r border-slate-100">No</th>
                                        <th className="px-6 py-4 sticky left-[144px] bg-slate-50 z-20 border-r border-slate-100 min-w-[320px]">Product Info</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">SKU / Barcode</th>
                                        <th className="px-6 py-4">Brand / IP</th>
                                        <th className="px-6 py-4">SRP</th>
                                        <th className="px-6 py-4">Total Qty</th>
                                        <th className="px-6 py-4">In Carton</th>
                                        <th className="px-6 py-4 text-center">Launch Week</th>
                                        <th className="px-6 py-4 text-center">Fully Launched</th>
                                        {filteredStores.map(store => (
                                            <th key={store.id} className="px-4 py-4 text-center min-w-[140px] border-l border-slate-100">
                                                <div className="text-[9px] mb-1">{store.name}</div>
                                                <div className="flex justify-center gap-2">
                                                    <span className="text-[8px] text-slate-400">ALLOC</span>
                                                    <span className="text-[8px] text-indigo-500">REMAIN</span>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-6 py-4 text-center border-l border-slate-100 bg-slate-100/30">Total Alloc</th>
                                        <th className="px-6 py-4 text-center border-l border-slate-100 bg-slate-100/30 font-black">Warehouse Bal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={12 + filteredStores.length} className="p-20 text-center">
                                                <div className="flex flex-col items-center">
                                                    <Package size={48} className="text-slate-200 mb-4" />
                                                    <p className="text-slate-400 font-medium">No products match your filters.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItems.map(item => (
                                            <ShipmentItemRow
                                                key={item.id}
                                                item={item}
                                                index={filteredItems.indexOf(item)}
                                                isMD={isMD}
                                                stores={stores}
                                                filteredStores={filteredStores}
                                                allocations={allocations}
                                                storeOrdersCount={storeOrdersCount}
                                                onUpdateAllocation={handleUpdateAllocation}
                                                onEditItem={(item) => {
                                                    setEditingItem(item);
                                                    setIsItemModalOpen(true);
                                                }}
                                                onDeleteItem={handleDeleteItem}
                                                onMoveItem={handleMoveItem}
                                                isFirst={filteredItems.indexOf(item) === 0}
                                                isLast={filteredItems.indexOf(item) === filteredItems.length - 1}
                                                onShowAllImages={handleShowAllImages}
                                                onUpdateLaunchWeek={handleUpdateLaunchWeek}
                                                onToggleLaunch={handleToggleLaunch}
                                            />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="block md:hidden p-4 space-y-4">
                            {filteredItems.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Package size={32} className="mx-auto text-slate-200 mb-2" />
                                    <p className="text-sm text-slate-400">No products found.</p>
                                </div>
                            ) : (
                                filteredItems.map(item => (
                                    <ShipmentItemCard
                                        key={item.id}
                                        item={item}
                                        isMD={isMD}
                                        filteredStores={filteredStores}
                                        allocations={allocations}
                                        onUpdateAllocation={handleUpdateAllocation}
                                        onEditItem={(item) => {
                                            setEditingItem(item);
                                            setIsItemModalOpen(true);
                                        }}
                                        onDeleteItem={handleDeleteItem}
                                        onShowAllImages={handleShowAllImages}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <History size={18} className="text-indigo-600" />
                            System Audit Trail
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {logs.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 italic">No activity recorded yet.</div>
                        ) : (
                            logs.map(log => (
                                <div key={log.id} className="p-4 flex gap-4 items-start hover:bg-slate-50 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                                        <History size={14} className="text-slate-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm font-bold text-slate-900">{log.action}</p>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                {new Date(log.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            by <span className="font-bold text-slate-700">{log.user_name}</span> ({log.user_role})
                                        </p>
                                        <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                                                {formatLogDetails(log)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <AdminShipmentItemModal
                isOpen={isItemModalOpen}
                onClose={() => setIsItemModalOpen(false)}
                shipmentId={id!}
                editItem={editingItem}
                onSuccess={() => fetchData()}
                isMD={isMD}
            />

            <AdminShipmentImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                shipmentId={id!}
                onSuccess={() => fetchData()}
            />

            <AdminShipmentSortModal
                isOpen={isSortModalOpen}
                onClose={() => setIsSortModalOpen(false)}
                shipmentId={id!}
                items={items}
                onSuccess={() => fetchData()}
            />

            {previewImage && previewImage.allImages && (
                <FullscreenGallery
                    images={previewImage.allImages}
                    initialIndex={previewImage.allImages.indexOf(previewImage.url)}
                    onClose={() => setPreviewImage(null)}
                />
            )}

            {/* Floating Action Button (Mobile) */}
            {isMD && (
                <button
                    onClick={() => {
                        setEditingItem(null);
                        setIsItemModalOpen(true);
                    }}
                    className="md:hidden fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-premium hover:bg-indigo-700 hover:scale-105 transition-all z-40"
                >
                    <Plus size={24} />
                </button>
            )}
        </div>
    );
};

// ==========================================
// MEMOIZED COMPONENTS FOR PERFORMANCE
// ==========================================

interface ShipmentItemRowProps {
    item: ShipmentItem;
    index: number;
    isMD: boolean;
    stores: any[];
    filteredStores: any[];
    allocations: Record<string, number>;
    storeOrdersCount: Record<string, Record<string, number>>;
    onUpdateAllocation: (itemId: string, storeName: string, value: string) => void;
    onEditItem: (item: ShipmentItem) => void;
    onDeleteItem: (itemId: string) => void;
    onMoveItem: (index: number, direction: 'up' | 'down') => void;
    isFirst: boolean;
    isLast: boolean;
    onShowAllImages: (item: ShipmentItem) => void;
    onUpdateLaunchWeek: (item: ShipmentItem, value: string) => void;
    onToggleLaunch: (item: ShipmentItem) => void;
}

const ShipmentItemRow = React.memo<ShipmentItemRowProps>(({
    item,
    index,
    isMD,
    stores,
    filteredStores,
    allocations,
    storeOrdersCount,
    onUpdateAllocation,
    onEditItem,
    onDeleteItem,
    onMoveItem,
    isFirst,
    isLast,
    onShowAllImages,
    onUpdateLaunchWeek,
    onToggleLaunch
}) => {
    const totalAlloc = stores.reduce((sum, s) => sum + (allocations[`${item.id}:${s.name}`] || 0), 0);
    const remaining = item.quantity - totalAlloc;

    return (
        <tr className="hover:bg-slate-50/50 transition-colors group/row">
            {isMD && (
                <td className="px-6 py-4 text-center sticky left-0 bg-white group-hover/row:bg-slate-50 transition-colors z-20 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-center gap-2">
                        <button
                            onClick={() => onEditItem(item)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Product"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Product"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </td>
            )}
            <td className="px-6 py-4 text-center sticky left-[88px] bg-white group-hover/row:bg-slate-50 transition-colors z-10 border-r border-slate-100">
                <span className="text-xs font-black text-slate-400">
                    {index + 1}
                </span>
            </td>
            <td className="px-6 py-4 min-w-[320px] sticky left-[144px] bg-white group-hover/row:bg-slate-50 transition-colors z-10 border-r border-slate-100">
                <div className="flex items-center gap-4">
                    {isMD && (
                        <div className="flex flex-col gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                            <button 
                                onClick={() => onMoveItem(index, 'up')}
                                disabled={isFirst}
                                className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20 transition-colors"
                                title="Move Up"
                            >
                                <ChevronUp size={16} />
                            </button>
                            <button 
                                onClick={() => onMoveItem(index, 'down')}
                                disabled={isLast}
                                className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20 transition-colors"
                                title="Move Down"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>
                    )}
                    {item.image_url ? (
                        <button 
                            onClick={() => onShowAllImages(item)}
                            className="relative group shrink-0"
                        >
                            <img src={item.image_url} alt="" loading="lazy" className="w-10 h-10 rounded-lg object-cover bg-slate-100 group-hover:opacity-75 transition-all" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ZoomIn size={14} className="text-white drop-shadow-md" />
                            </div>
                        </button>
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                            <Package size={20} />
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight">{item.name}</p>
                        <p className="text-[10px] text-slate-500">SRP: {item.srp?.toLocaleString() || '0'}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                {!item.is_repeat_order ? (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold uppercase tracking-tight">New Item</span>
                ) : (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-tight">Repeat</span>
                )}
            </td>
            <td className="px-6 py-4">
                <p className="text-sm font-bold text-slate-900">{item.sku}</p>
                <p className="text-[10px] text-slate-400 font-mono">{item.barcode || '-'}</p>
            </td>
            <td className="px-6 py-4">
                <p className="text-xs font-bold text-slate-900">{item.brand || '-'}</p>
                <p className="text-[10px] text-indigo-600 font-bold">{item.ip_name || '-'}</p>
            </td>
            <td className="px-6 py-4">
                <p className="text-sm font-bold text-slate-900">
                    Rp {item.srp?.toLocaleString()}
                </p>
            </td>
            <td className="px-6 py-4 text-center">
                <span className="inline-flex px-2 py-1 bg-slate-100 rounded text-sm font-bold text-slate-900">
                    {item.quantity}
                </span>
            </td>
            <td className="px-6 py-4 text-center">
                <span className="text-sm font-bold text-slate-600">
                    {item.qty_in_carton || 0}
                </span>
            </td>
            <td className="px-6 py-4 text-center">
                {isMD ? (
                    <input
                        type="text"
                        placeholder="Week X..."
                        className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        defaultValue={item.launch_week || ''}
                        onBlur={(e) => onUpdateLaunchWeek(item, e.target.value)}
                    />
                ) : (
                    <span className="text-xs text-slate-600 font-medium">{item.launch_week || '-'}</span>
                )}
            </td>
            <td className="px-6 py-4 text-center">
                <button
                    onClick={() => isMD && onToggleLaunch(item)}
                    disabled={!isMD}
                    className={`p-1.5 rounded-lg transition-colors ${!isMD ? 'cursor-not-allowed opacity-60' : ''} ${
                        item.is_fully_launched 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-slate-100 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'
                    }`}
                >
                    {item.is_fully_launched ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                </button>
            </td>
            {filteredStores.map(store => {
                const key = `${item.id}:${store.name}`;
                const val = allocations[key] || 0;
                const ordered = storeOrdersCount[item.sku]?.[store.id] || 0;
                const storeRemaining = val - ordered;

                return (
                    <td key={store.id} className="px-2 py-4 border-l border-slate-100">
                        <div className="flex flex-col items-center gap-1.5">
                            <input
                                type="number"
                                value={val}
                                onChange={(e) => onUpdateAllocation(item.id, store.name, e.target.value)}
                                className={`w-16 px-2 py-1.5 rounded-lg text-center text-sm font-bold border outline-none transition-all ${
                                    val > 0 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                    : 'bg-slate-50 border-slate-100 text-slate-400'
                                } focus:ring-2 focus:ring-indigo-500/20`}
                            />
                            <div className={`text-[9px] font-black uppercase tracking-tighter ${
                                storeRemaining <= 0 && val > 0 
                                ? 'text-red-500' 
                                : storeRemaining < val 
                                ? 'text-amber-500' 
                                : 'text-slate-400'
                            }`}>
                                {storeRemaining} Left
                            </div>
                        </div>
                    </td>
                );
            })}
            <td className="px-6 py-4 text-center border-l border-slate-100 bg-slate-100/30">
                <span className="text-sm font-black text-slate-900">{totalAlloc}</span>
            </td>
            <td className="px-6 py-4 text-center border-l border-slate-100 bg-slate-100/30">
                <span className={`text-sm font-black ${remaining < 0 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
                    {remaining}
                </span>
            </td>
        </tr>
    );
}, (prev, next) => {
    if (prev.item !== next.item) return false;
    if (prev.index !== next.index) return false;
    if (prev.isMD !== next.isMD) return false;
    if (prev.isFirst !== next.isFirst) return false;
    if (prev.isLast !== next.isLast) return false;
    if (prev.filteredStores.length !== next.filteredStores.length) return false;
    
    // Check allocations for this specific item
    for (const store of prev.filteredStores) {
        const key = `${prev.item.id}:${store.name}`;
        if (prev.allocations[key] !== next.allocations[key]) {
            return false;
        }
    }
    
    // Check store orders count for this specific item sku
    const prevOrders = prev.storeOrdersCount[prev.item.sku] || {};
    const nextOrders = next.storeOrdersCount[next.item.sku] || {};
    for (const store of prev.filteredStores) {
        if (prevOrders[store.id] !== nextOrders[store.id]) {
            return false;
        }
    }

    return true;
});

interface ShipmentItemCardProps {
    item: ShipmentItem;
    isMD: boolean;
    filteredStores: any[];
    allocations: Record<string, number>;
    onUpdateAllocation: (itemId: string, storeName: string, value: string) => void;
    onEditItem: (item: ShipmentItem) => void;
    onDeleteItem: (itemId: string) => void;
    onShowAllImages: (item: ShipmentItem) => void;
}

const ShipmentItemCard = React.memo<ShipmentItemCardProps>(({
    item,
    isMD,
    filteredStores,
    allocations,
    onUpdateAllocation,
    onEditItem,
    onDeleteItem,
    onShowAllImages
}) => {
    const totalAlloc = filteredStores.reduce((sum, s) => sum + (allocations[`${item.id}:${s.name}`] || 0), 0);
    const remaining = item.quantity - totalAlloc;

    return (
        <div className="bg-slate-50 rounded-[1.5rem] p-4 border border-slate-100 shadow-sm">
            <div className="flex gap-4">
                {item.image_url ? (
                    <button onClick={() => onShowAllImages(item)} className="w-20 h-20 rounded-xl shrink-0 overflow-hidden relative group/thumb border border-white shadow-sm">
                        <img src={item.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100">
                            <ZoomIn size={16} className="text-white" />
                        </div>
                    </button>
                ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 border border-white shadow-sm text-slate-400">
                        <Package size={24} />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 leading-tight mb-1">{item.name}</h4>
                    <p className="text-[10px] font-mono text-slate-400">{item.sku}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{item.brand}</p>
                    <p className="text-sm font-black text-indigo-600 mt-2">Rp {item.srp?.toLocaleString()}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200">
                <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-sm">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Qty</div>
                    <div className="font-black text-slate-700">{item.quantity}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-sm">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Remaining</div>
                    <div className={`font-black ${remaining < 0 ? 'text-red-500' : 'text-indigo-600'}`}>{remaining}</div>
                </div>
            </div>

            <div className="mt-4 bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Store Allocations</p>
                <div className="space-y-2">
                    {filteredStores.map(store => {
                        const key = `${item.id}:${store.name}`;
                        const val = allocations[key] || 0;
                        return (
                            <div key={store.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                                <span className="text-xs font-bold text-slate-700">{store.name}</span>
                                {isMD ? (
                                    <input
                                        type="number"
                                        min="0"
                                        value={val === 0 ? '' : val}
                                        onChange={(e) => onUpdateAllocation(item.id, store.name, e.target.value)}
                                        className="w-20 px-2 py-1.5 text-right text-xs font-black border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="0"
                                    />
                                ) : (
                                    <span className="font-black text-indigo-600">{val}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {isMD && (
                <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200">
                    <button
                        onClick={() => onEditItem(item)}
                        className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Edit2 size={14} /> Edit
                    </button>
                    <button
                        onClick={() => onDeleteItem(item.id)}
                        className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl text-xs hover:bg-red-100 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            )}
        </div>
    );
}, (prev, next) => {
    if (prev.item !== next.item) return false;
    if (prev.isMD !== next.isMD) return false;
    if (prev.filteredStores.length !== next.filteredStores.length) return false;
    
    // Check allocations for this specific item
    for (const store of prev.filteredStores) {
        const key = `${prev.item.id}:${store.name}`;
        if (prev.allocations[key] !== next.allocations[key]) {
            return false;
        }
    }
    return true;
});
