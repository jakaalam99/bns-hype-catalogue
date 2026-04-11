/**
 * Image Processor Utility
 * Handles browser-side image manipulation using Canvas API.
 */

export interface WatermarkOptions {
  opacity?: number; // 0 to 1
  padding?: number;
  scale?: number; // 0 to 1 (percentage of image width)
  position?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  offsetX?: number;
  offsetY?: number;
}

/**
 * Applies a watermark image to a product image.
 * Returns a new File object with the watermarked image.
 */
export const applyWatermark = async (
  imageFile: File,
  watermarkUrl: string,
  options: WatermarkOptions = {}
): Promise<File> => {
  const { 
    opacity = 0.7, 
    padding = 60, 
    scale = 0.25, 
    position = 'top-center',
    offsetX = 0,
    offsetY = 0
  } = options;

  // If no watermark URL, return original file
  if (!watermarkUrl) return imageFile;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.error('Failed to get canvas context');
          return resolve(imageFile);
        }

        // Set canvas to match original image dimensions
        canvas.width = img.width;
        canvas.height = img.height;

        // 1. Draw original product image
        ctx.drawImage(img, 0, 0);

        // 2. Load and draw watermark
        const watermark = new Image();
        watermark.crossOrigin = 'anonymous'; 
        
        watermark.onload = () => {
          ctx.save();
          ctx.globalAlpha = opacity;
          
          // Calculate watermark dimensions (keep aspect ratio)
          const maxW = canvas.width * scale;
          const maxH = canvas.height * scale;
          
          let wWidth = watermark.width;
          let wHeight = watermark.height;
          
          const ratio = Math.min(maxW / wWidth, maxH / wHeight);
          wWidth = wWidth * ratio;
          wHeight = wHeight * ratio;

          // Calculate position based on 9-point grid
          let x, y;

          // X Coordinate
          if (position.includes('left')) {
            x = padding;
          } else if (position.includes('right')) {
            x = canvas.width - wWidth - padding;
          } else { // center
            x = (canvas.width - wWidth) / 2;
          }

          // Y Coordinate
          if (position.includes('top')) {
            y = padding;
          } else if (position.includes('bottom')) {
            y = canvas.height - wHeight - padding;
          } else { // center
            y = (canvas.height - wHeight) / 2;
          }

          // Special case for exact 'center' which doesn't include top/bottom/left/right
          if (position === 'center') {
            x = (canvas.width - wWidth) / 2;
            y = (canvas.height - wHeight) / 2;
          }

          // Draw the watermark
          ctx.drawImage(watermark, x + offsetX, y + offsetY, wWidth, wHeight);
          ctx.restore();

          // 3. Export back to File
          canvas.toBlob((blob) => {
            if (blob) {
              const fileName = imageFile.name;
              const fileType = imageFile.type;
              resolve(new File([blob], fileName, { type: fileType }));
            } else {
              resolve(imageFile);
            }
          }, imageFile.type, 0.92);
        };

        watermark.onerror = () => {
          console.warn('Failed to load watermark image, skipping.');
          resolve(imageFile);
        };

        watermark.src = watermarkUrl;
      };
      
      img.onerror = () => {
        console.error('Failed to load product image for watermarking');
        resolve(imageFile);
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject('Failed to read file');
    reader.readAsDataURL(imageFile);
  });
};
