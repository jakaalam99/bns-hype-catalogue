import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const PageTracker = () => {
    const location = useLocation();

    useEffect(() => {
        const recordView = async () => {
            // Ignore admin routes for public traffic stats
            if (location.pathname.startsWith('/admin')) return;

            try {
                await supabase.from('page_views').insert([
                    { path: location.pathname }
                ]);
            } catch (error) {
                console.error("Failed to record page view", error);
            }
        };

        recordView();
    }, [location.pathname]);

    return null; // This component doesn't render anything
};
