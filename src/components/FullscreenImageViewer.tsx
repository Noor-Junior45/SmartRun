import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { hapticLight, hapticMedium } from '../utils/haptics';

interface FullscreenImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  productName?: string;
}

export const FullscreenImageViewer: React.FC<FullscreenImageViewerProps> = ({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  productName = 'Product Photo'
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const touchStartPos = useRef({ x: 0, y: 0, time: 0 });
  const lastTapTime = useRef(0);
  const pinchStartDist = useRef(0);
  const initialScale = useRef(1);

  const isZoomed = scale > 1.05;

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
      setScale(1);
      setPosition({ x: 0, y: 0 });
      // Prevent background scrolling while modal is open
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, initialIndex, images.length]);

  // Handle ESC key to exit
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length]);

  const handleResetZoom = () => {
    hapticLight();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleToggleZoom = () => {
    hapticMedium();
    if (isZoomed) {
      handleResetZoom();
    } else {
      setScale(2.5);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleDoubleTap = (clientX: number, clientY: number) => {
    hapticMedium();
    if (isZoomed) {
      handleResetZoom();
    } else {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = clientX - rect.left - rect.width / 2;
        const offsetY = clientY - rect.top - rect.height / 2;
        setScale(2.5);
        setPosition({
          x: -offsetX * 1.5,
          y: -offsetY * 1.5
        });
      } else {
        setScale(2.5);
      }
    }
  };

  const goToNext = () => {
    if (images.length <= 1) return;
    hapticLight();
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const goToPrev = () => {
    if (images.length <= 1) return;
    hapticLight();
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  // Touch event handlers for pinch zoom & swipe navigation
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 2 fingers: pinch zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDist.current = dist;
      initialScale.current = scale;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();

      touchStartPos.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: now
      };

      // Double tap detector
      if (now - lastTapTime.current < 300) {
        handleDoubleTap(touch.clientX, touch.clientY);
        lastTapTime.current = 0;
        return;
      }
      lastTapTime.current = now;

      if (isZoomed) {
        setIsDragging(true);
        dragStart.current = {
          x: touch.clientX - position.x,
          y: touch.clientY - position.y
        };
      }
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / pinchStartDist.current;
      const newScale = Math.min(4, Math.max(1, initialScale.current * factor));
      setScale(newScale);
      if (newScale <= 1.05) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isZoomed && isDragging) {
      const touch = e.touches[0];
      const maxOffset = (scale - 1) * 200;
      const newX = Math.max(-maxOffset, Math.min(maxOffset, touch.clientX - dragStart.current.x));
      const newY = Math.max(-maxOffset, Math.min(maxOffset, touch.clientY - dragStart.current.y));
      setPosition({ x: newX, y: newY });
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false);
    pinchStartDist.current = 0;

    if (scale < 1.08) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }

    // Horizontal swipe when not zoomed
    if (!isZoomed && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartPos.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
      const duration = Date.now() - touchStartPos.current.time;

      if (duration < 450 && Math.abs(deltaX) > 40 && deltaY < 80) {
        if (deltaX < 0) {
          goToNext();
        } else {
          goToPrev();
        }
      }
    }
  };

  if (!isOpen || images.length === 0) return null;

  const activeSrc = images[currentIndex] || images[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full screen image viewer"
      className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between select-none touch-none backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between px-4 py-3 sm:py-4 bg-gradient-to-b from-black/80 to-transparent z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
            aria-label="Close full screen viewer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div className="min-w-0">
            <p className="text-white font-bold text-xs sm:text-sm truncate max-w-[220px] sm:max-w-md">
              {productName}
            </p>
            <p className="text-white/60 text-[11px] font-medium">
              {currentIndex + 1} of {images.length}
            </p>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          {isZoomed ? (
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-3 py-1.5 rounded-full bg-amber-500/90 text-slate-950 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ({(scale).toFixed(1)}x)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleToggleZoom}
              className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer border border-white/20"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Zoom</span>
            </button>
          )}
        </div>
      </div>

      {/* Center Image Display Area */}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex-1 w-full h-full relative flex items-center justify-center overflow-hidden p-2 sm:p-6"
      >
        <img
          src={activeSrc}
          alt={`Full view ${currentIndex + 1}`}
          className="max-h-[85vh] max-w-full object-contain pointer-events-none transition-transform duration-75 will-change-transform drop-shadow-2xl"
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            cursor: isZoomed ? 'grab' : 'zoom-in'
          }}
          draggable={false}
        />

        {/* Previous Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={goToPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md z-10 active:scale-90 border border-white/10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          </button>
        )}

        {/* Next Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={goToNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md z-10 active:scale-90 border border-white/10"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip & Mobile Helper Indicator */}
      <div className="w-full px-4 py-3 sm:py-4 bg-gradient-to-t from-black/80 to-transparent z-20 flex flex-col items-center gap-2">
        <p className="text-white/60 text-[10px] sm:text-xs">
          Double-tap or pinch to zoom • Swipe horizontally to view other photos
        </p>

        {images.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-full px-2 py-1 scrollbar-none">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  hapticLight();
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                  setCurrentIndex(idx);
                }}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 transition-all p-1 bg-white/5 shrink-0 cursor-pointer ${
                  currentIndex === idx
                    ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105'
                    : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
