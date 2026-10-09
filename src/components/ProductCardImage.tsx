import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { NEUTRAL_PRODUCT_PLACEHOLDER } from '../data/productColorImages';

interface ProductCardImageProps {
  images?: string[];
  imageUrl?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  autoRotateInterval?: number; // In ms, default 3200ms
  enableHoverRotate?: boolean;
}

export const ProductCardImage = ({
  images = [],
  imageUrl,
  alt,
  className = '',
  containerClassName = '',
  autoRotateInterval = 3200,
  enableHoverRotate = true
}: ProductCardImageProps) => {
  // Collect all valid unique images
  const allImages = React.useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(images)) {
      images.forEach((img) => {
        if (typeof img === 'string' && img.trim().length > 0 && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      });
    }
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0 && !list.includes(imageUrl.trim())) {
      list.unshift(imageUrl.trim());
    }
    return list.length > 0
      ? list
      : [NEUTRAL_PRODUCT_PLACEHOLDER];
  }, [images, imageUrl]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasMultipleImages = allImages.length > 1;

  // Auto-cycle through images every cycle interval when product has > 1 image
  useEffect(() => {
    if (!hasMultipleImages) return;

    // Faster rotation on hover (1800ms) or standard auto rotation (3200ms)
    const intervalTime = isHovered && enableHoverRotate ? 1800 : autoRotateInterval;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % allImages.length);
    }, intervalTime);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [hasMultipleImages, allImages.length, isHovered, enableHoverRotate, autoRotateInterval]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % allImages.length);
  };

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex(index);
  };

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden select-none ${containerClassName}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Current Product Image with smooth crossfade effect */}
      <img
        src={allImages[currentIndex] || allImages[0]}
        alt={`${alt} preview ${currentIndex + 1}`}
        className={`max-h-full max-w-full object-contain transition-all duration-300 drop-shadow-2xs ${className}`}
        loading="lazy"
        onError={(e) => {
          // Fallback if image fails to load
          const target = e.target as HTMLImageElement;
          target.src = NEUTRAL_PRODUCT_PLACEHOLDER;
        }}
      />

      {/* Multiple Images Indicator Badge & Controls */}
      {hasMultipleImages && (
        <>
          {/* Subtle multi-image count badge at top right */}
          <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 bg-slate-900/70 hover:bg-slate-900/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs transition-opacity duration-200 shadow-xs pointer-events-none">
            <Images className="w-2.5 h-2.5" />
            <span>
              {currentIndex + 1}/{allImages.length}
            </span>
          </div>

          {/* Quick Prev / Next Arrow overlays visible on card hover */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous product image"
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md cursor-pointer border border-slate-200 active:scale-90"
          >
            <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next product image"
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md cursor-pointer border border-slate-200 active:scale-90"
          >
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          {/* Interactive Pagination Dots at the bottom of the card image */}
          <div className="absolute bottom-1.5 left-0 right-0 z-20 flex items-center justify-center gap-1 px-2 pointer-events-auto">
            {allImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleDotClick(e, idx)}
                onMouseEnter={() => setCurrentIndex(idx)}
                aria-label={`View product image ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentIndex === idx
                    ? 'w-4 h-1 bg-amber-500 shadow-xs'
                    : 'w-1.5 h-1 bg-slate-300 hover:bg-slate-400 opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
