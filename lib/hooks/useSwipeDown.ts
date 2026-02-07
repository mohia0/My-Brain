import { useState, TouchEvent, RefObject } from 'react';

export function useSwipeDown(onClose: () => void, threshold = 100, containerRef?: RefObject<HTMLElement | null>) {
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);
    const [offset, setOffset] = useState(0);

    const onTouchStart = (e: TouchEvent) => {
        // Only allow swipe if we are at the top of the scrollable container (if provided)
        if (containerRef?.current && containerRef.current.scrollTop > 5) {
            setTouchStart(null);
            return;
        }

        setTouchEnd(null);
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchMove = (e: TouchEvent) => {
        if (!touchStart) return;

        const currentTouch = {
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        };

        const dy = currentTouch.y - touchStart.y;
        const dx = currentTouch.x - touchStart.x;

        // Only allow swiping down if moving more vertically than horizontally
        if (dy > 0 && dy > Math.abs(dx)) {
            setOffset(dy);
            setTouchEnd(currentTouch);
        } else {
            // If they are scrolling up (dy < 0), or moving sideways, reset.
            // But if they are moving sideways, we might want to just ignore.
            if (dy < 0) {
                setOffset(0);
                setTouchStart(null); // Abort swipe down if they reverse direction
            }
        }
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) {
            setOffset(0);
            setTouchStart(null);
            return;
        }

        const distance = touchEnd.y - touchStart.y;
        if (distance > threshold) {
            onClose();
        }
        setOffset(0);
        setTouchStart(null);
    };

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        offset: offset > 0 ? offset : 0
    };
}
