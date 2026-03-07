import React, { createContext, useContext, useState, useEffect } from 'react';

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

    // Initialize from localStorage
    useEffect(() => {
        const savedBasket = localStorage.getItem('bns_basket');
        if (savedBasket) {
            try {
                setItems(JSON.parse(savedBasket));
            } catch (e) {
                console.error('Failed to parse basket from localStorage', e);
            }
        }
    }, []);

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem('bns_basket', JSON.stringify(items));
    }, [items]);

    const addToBasket = (product: any, quantity: number) => {
        if (quantity <= 0) return;

        setItems(prev => {
            const existingItem = prev.find(item => item.sku === product.sku);
            if (existingItem) {
                return prev.map(item =>
                    item.sku === product.sku
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            const newItem: BasketItem = {
                id: product.id,
                name: product.name,
                sku: product.sku || '',
                barcode: product.barcode || '',
                brand: product.brand || '',
                category: product.category || '',
                image_url: product.images?.[0]?.image_url || null,
                quantity: quantity
            };
            return [...prev, newItem];
        });
    };

    const removeFromBasket = (sku: string) => {
        setItems(prev => prev.filter(item => item.sku !== sku));
    };

    const updateQuantity = (sku: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromBasket(sku);
            return;
        }
        setItems(prev => prev.map(item =>
            item.sku === sku ? { ...item, quantity } : item
        ));
    };

    const clearBasket = () => {
        setItems([]);
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
