import React, { useState } from 'react';
import { X, ZoomIn, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImagePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
    allImages?: string[];
    title?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, imageUrl, allImages = [], title }) => {
    const images = allImages.length > 0 ? allImages : (imageUrl ? [imageUrl] : []);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Sync index with the initial imageUrl if provided and not in allImages
    React.useEffect(() => {
        if (imageUrl && images.includes(imageUrl)) {
            setCurrentIndex(images.indexOf(imageUrl));
        } else {
            setCurrentIndex(0);
        }
    }, [imageUrl, allImages]);

    if (!isOpen || images.length === 0) return null;

    const currentImage = images[currentIndex];

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-10 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg">
                            <ZoomIn className="text-white" size={20} />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-white font-bold tracking-tight drop-shadow-md">
                                {title || 'Image Preview'}
                            </h3>
                            {images.length > 1 && (
                                <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">
                                    Image {currentIndex + 1} of {images.length}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a 
                            href={currentImage} 
                            download 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md"
                            title="Download Image"
                        >
                            <Download size={20} />
                        </a>
                        <button 
                            onClick={onClose}
                            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="relative group/container w-full flex items-center justify-center">
                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                        <>
                            <button 
                                onClick={prevImage}
                                className="absolute left-4 z-20 p-4 bg-black/20 hover:bg-black/40 text-white rounded-2xl backdrop-blur-md transition-all opacity-0 group-hover/container:opacity-100"
                            >
                                <ChevronLeft size={32} />
                            </button>
                            <button 
                                onClick={nextImage}
                                className="absolute right-4 z-20 p-4 bg-black/20 hover:bg-black/40 text-white rounded-2xl backdrop-blur-md transition-all opacity-0 group-hover/container:opacity-100"
                            >
                                <ChevronRight size={32} />
                            </button>
                        </>
                    )}

                    {/* Image Container */}
                    <div className="bg-white p-2 rounded-3xl shadow-2xl overflow-hidden flex items-center justify-center min-h-[300px] w-full">
                        <img 
                            key={currentImage}
                            src={currentImage} 
                            alt={title || 'Preview'} 
                            className="max-w-full max-h-[80vh] object-contain select-none animate-fade-in"
                        />
                    </div>
                </div>

                {/* Footer/Hint */}
                <p className="mt-6 text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-sm">
                    {images.length > 1 ? 'Use arrows or thumbnails to navigate • Click outside to close' : 'Click outside to close'}
                </p>

                {/* Thumbnails Strip */}
                {images.length > 1 && (
                    <div className="mt-6 flex gap-3 overflow-x-auto p-4 max-w-full scrollbar-hide bg-black/20 rounded-[2rem] backdrop-blur-sm shadow-inner">
                        {images.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                                    currentIndex === idx ? 'border-white scale-110 shadow-2xl z-10' : 'border-transparent opacity-40 hover:opacity-100 hover:scale-105'
                                }`}
                            >
                                <img src={img} className="w-full h-full object-cover" alt="" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
