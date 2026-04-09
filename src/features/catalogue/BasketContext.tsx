import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../auth/useAuthStore';

export interface BasketItem {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    brand: string;
    category: string;
    image_url: string | null;
    quantity: number;
}

interface BasketContextType {
    items: BasketItem[];
    addToBasket: (product: any, quantity: number) => void;
    removeFromBasket: (sku: string) => void;
    updateQuantity: (sku: string, quantity: number) => void;
    clearBasket: () => void;
    totalCount: number;
}

const BasketContext = createContext<BasketContextType | undefined>(undefined);

export const BasketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<BasketItem[]>([]);
    const { user } = useAuthStore();
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Initial load from Supabase or LocalStorage
    useEffect(() => {
        const loadBasket = async () => {
            if (user) {
                try {
                    const { data, error } = await supabase
                        .from('basket_items')
                        .select(`
                            quantity,
                            products (
                                id, name, sku, barcode, brand, category,
                                product_images(*)
                            )
                        `)
                        .eq('user_id', user.id);

                    if (error) throw error;

                    if (data && data.length > 0) {
                        const dbItems = data.map((row: any) => {
                            const p = row.products;
                            const primaryImage = p.product_images?.find((img: any) => img.display_order === 0) || p.product_images?.[0];
                            return {
                                id: p.id,
                                name: p.name,
                                sku: p.sku || '',
                                barcode: p.barcode || '',
                                brand: p.brand || '',
                                category: p.category || '',
                                image_url: primaryImage?.image_url || null,
                                quantity: row.quantity
                            };
                        });
                        setItems(dbItems);
                    } else {
                        // If DB is empty, maybe try loading from localStorage to "merge" or migrating guest items
                        const savedBasket = localStorage.getItem('bns_basket');
                        if (savedBasket) {
                            try {
                                const localItems = JSON.parse(savedBasket);
                                if (localItems.length > 0) {
                                    setItems(localItems);
                                    // Optionally sync these to the database here
                                }
                            } catch (e) {}
                        }
                    }
                } catch (err) {
                    console.error('Failed to load basket from DB', err);
                }
            } else {
                const savedBasket = localStorage.getItem('bns_basket');
                if (savedBasket) {
                    try {
                        setItems(JSON.parse(savedBasket));
                    } catch (e) {
                        console.error('Failed to parse basket from localStorage', e);
                    }
                }
            }
            setIsInitialLoad(false);
        };

        loadBasket();
    }, [user]);

    // Persist to localStorage for fallback/guest
    useEffect(() => {
        if (!isInitialLoad) {
            localStorage.setItem('bns_basket', JSON.stringify(items));
        }
    }, [items, isInitialLoad]);

    const addToBasket = async (product: any, quantity: number) => {
        if (quantity <= 0) return;

        // Optimistic UI
        const existingItem = items.find(item => item.sku === product.sku);
        const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;

        setItems(prev => {
            if (existingItem) {
                return prev.map(item =>
                    item.sku === product.sku
                        ? { ...item, quantity: newQuantity }
                        : item
                );
            }
            const primaryImage = product.images?.find((img: any) => img.display_order === 0) || product.images?.[0];
            const newItem: BasketItem = {
                id: product.id,
                name: product.name,
                sku: product.sku || '',
                barcode: product.barcode || '',
                brand: product.brand || '',
                category: product.category || '',
                image_url: primaryImage?.image_url || null,
                quantity: quantity
            };
            return [...prev, newItem];
        });

        // Sync with Database if logged in
        if (user) {
            try {
                const { error } = await supabase
                    .from('basket_items')
                    .upsert({
                        user_id: user.id,
                        product_id: product.id,
                        quantity: newQuantity
                    }, { onConflict: 'user_id, product_id' });
                
                if (error) throw error;
            } catch (err) {
                console.error('Failed to sync addToBasket to DB', err);
            }
        }
    };

    const removeFromBasket = async (sku: string) => {
        const itemToRemove = items.find(item => item.sku === sku);
        setItems(prev => prev.filter(item => item.sku !== sku));

        if (user && itemToRemove) {
            try {
                const { error } = await supabase
                    .from('basket_items')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('product_id', itemToRemove.id);
                
                if (error) throw error;
            } catch (err) {
                console.error('Failed to sync removeFromBasket to DB', err);
            }
        }
    };

    const updateQuantity = async (sku: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromBasket(sku);
            return;
        }

        const itemToUpdate = items.find(item => item.sku === sku);
        setItems(prev => prev.map(item =>
            item.sku === sku ? { ...item, quantity } : item
        ));

        if (user && itemToUpdate) {
            try {
                const { error } = await supabase
                    .from('basket_items')
                    .update({ quantity })
                    .eq('user_id', user.id)
                    .eq('product_id', itemToUpdate.id);
                
                if (error) throw error;
            } catch (err) {
                console.error('Failed to sync updateQuantity to DB', err);
            }
        }
    };

    const clearBasket = async () => {
        setItems([]);
        if (user) {
            try {
                const { error } = await supabase
                    .from('basket_items')
                    .delete()
                    .eq('user_id', user.id);
                
                if (error) throw error;
            } catch (err) {
                console.error('Failed to sync clearBasket to DB', err);
            }
        }
    };

    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <BasketContext.Provider value={{ items, addToBasket, removeFromBasket, updateQuantity, clearBasket, totalCount }}>
            {children}
        </BasketContext.Provider>
    );
};

export const useBasket = () => {
    const context = useContext(BasketContext);
    if (!context) {
        throw new Error('useBasket must be used within a BasketProvider');
    }
    return context;
};
