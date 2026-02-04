"use client";

import React from 'react';
import styles from './ZoomWheel.module.css';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { Plus, Minus } from 'lucide-react';

export default function ZoomWheel() {
    const { scale, zoomAt } = useCanvasStore();

    // Mapping log scale for natural feel
    // Slider 0-100 represents scale 0.1 to 3
    const toSlider = (s: number) => {
        return ((s - 0.1) / (3 - 0.1)) * 100;
    };

    const fromSlider = (v: number) => {
        return 0.1 + (v / 100) * (3 - 0.1);
    };

    const handleZoom = (newScale: number) => {
        if (typeof window === 'undefined') return;
        zoomAt(newScale, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
    };

    const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value); // 0-100
        handleZoom(fromSlider(val));
    };

    return (
        <div className={styles.wrapper}>
            <button className={styles.btn} onClick={() => handleZoom(scale * 1.1)}>
                <Plus size={18} />
            </button>

            <div className={styles.wheelContainer}>
                <div className={styles.sliderTrack}>
                    <div className={styles.fill} style={{ height: `${toSlider(scale)}%` }} />
                    <div className={styles.thumb} style={{ bottom: `${toSlider(scale)}%` }} />

                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={toSlider(scale)}
                        onChange={handleRangeChange}
                        className={styles.rangeInput}
                        style={{ appearance: 'slider-vertical' } as any}
                    />
                </div>

                <div className={styles.label}>
                    {Math.round(scale * 100)}%
                </div>
            </div>

            <button className={styles.btn} onClick={() => handleZoom(scale * 0.9)}>
                <Minus size={18} />
            </button>
        </div>
    );
}
