import { useEffect } from 'react';
import { useStoreSettings } from '../features/catalogue/StoreSettingsContext';

export const FaviconManager = () => {
    const { settings } = useStoreSettings();

    const getDirectLink = (url: string) => {
        if (!url) return '';
        if (url.includes('drive.google.com')) {
            const matches = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
            if (matches && matches[1]) {
                return `https://drive.google.com/uc?export=view&id=${matches[1]}`;
            }
        }
        return url;
    };

    useEffect(() => {
        if (settings?.favicon_url) {
            const finalUrl = getDirectLink(settings.favicon_url);

            // Remove all existing icon links to avoid conflicts (especially with different types)
            const existingIcons = document.querySelectorAll("link[rel~='icon']");
            existingIcons.forEach(el => el.parentNode?.removeChild(el));

            // Create a fresh link element
            const link = document.createElement('link');
            link.rel = 'icon';
            // Add a cache-busting parameter
            link.href = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;

            // Append the new link to head
            document.head.appendChild(link);

            // Also add shortcut icon for better compatibility
            const shortcutLink = document.createElement('link');
            shortcutLink.rel = 'shortcut icon';
            shortcutLink.href = link.href;
            document.head.appendChild(shortcutLink);

            console.log('Favicon updated to:', link.href);
        }
    }, [settings?.favicon_url]);

    return null;
};
