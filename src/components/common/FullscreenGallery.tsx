import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface FullscreenGalleryProps {
    images: string[];
    initialIndex?: number;
    onClose: () => void;
}

export const FullscreenGallery: React.FC<FullscreenGalleryProps> = ({ 
    images, 
    initialIndex = 0, 
    onClose 
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex]);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    if (!images || images.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col backdrop-blur-sm">
            {/* Top Bar */}
            <div className="flex justify-between items-center p-4 text-white/50">
                <span className="text-sm font-mono tracking-widest">{currentIndex + 1} / {images.length}</span>
                <button 
                    onClick={onClose}
                    className="p-2 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Main Image */}
            <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
                <button 
                    className="absolute left-4 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden md:block"
                    onClick={handlePrev}
                >
                    <ChevronLeft size={32} />
                </button>
                
                <img 
                    src={images[currentIndex]} 
                    alt={`Gallery Image ${currentIndex + 1}`}
                    className="max-h-full max-w-full object-contain"
                />

                <button 
                    className="absolute right-4 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden md:block"
                    onClick={handleNext}
                >
                    <ChevronRight size={32} />
                </button>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="h-24 md:h-32 bg-black/50 p-4 flex justify-center items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`relative h-full aspect-square rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                                idx === currentIndex ? 'border-white scale-105' : 'border-transparent opacity-50 hover:opacity-100'
                            }`}
                        >
                            <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
