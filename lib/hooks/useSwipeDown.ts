import { useState, TouchEvent, RefObject } from 'react';

export function useSwipeDown(onClose: () => void, threshold = 100, containerRef?: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[], swipeZoneRef?: RefObject<HTMLElement | null>) {
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);
    const [offset, setOffset] = useState(0);

    const onTouchStart = (e: TouchEvent) => {
        // 1. If a specific swipe zone is defined (e.g. header), ONLY start if touch is inside it
        if (swipeZoneRef?.current) {
            if (!swipeZoneRef.current.contains(e.target as Node)) {
                setTouchStart(null);
                return;
            }
        } else {
            // 2. Fallback: Only allow swipe if starting near the top of the viewport
            // This prevents accidental closes when scrolling up-down in the middle of a long text
            if (e.targetTouches[0].clientY > 120) { // Only top 120px allowed for "global" swipe
                setTouchStart(null);
                return;
            }
        }

        // 3. Check scroll position (existing logic)
        // Only allow swipe if we are at the top of ALL provided scrollable containers
        const refs = Array.isArray(containerRef) ? containerRef : [containerRef];
        const isScrolled = refs.some(ref => ref?.current && ref.current.scrollTop > 5);

        if (isScrolled) {
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
