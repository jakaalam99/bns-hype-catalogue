import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import type { StoreSettings } from '../../types/settings';

interface StoreSettingsContextType {
    settings: StoreSettings | null;
    loading: boolean;
    refreshSettings: () => Promise<void>;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

export const StoreSettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<StoreSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('store_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) {
                // If no row exists yet, don't crash, just leave it mostly empty
                if (error.code === 'PGRST116') {
                    setSettings({
                        id: 1,
                        about_text: 'Welcome to BNS HYPE',
                        instagram_url: '',
                        tiktok_url: '',
                        whatsapp_number: '',
                        instagram_links: [],
                        tiktok_links: [],
                        whatsapp_links: [],
                        offline_stores: [],
                        social_links: [],
                        marketplace_links: [],
                        updated_at: new Date().toISOString()
                    });
                    return;
                }
                throw error;
            }
            setSettings(data as StoreSettings);
        } catch (error) {
            console.error('Error fetching store settings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return (
        <StoreSettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
            {children}
        </StoreSettingsContext.Provider>
    );
};

export const useStoreSettings = () => {
    const context = useContext(StoreSettingsContext);
    if (context === undefined) {
        throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
    }
    return context;
};
