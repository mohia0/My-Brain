"use client";

import React from 'react';
import styles from './ZoomWheel.module.css';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { Plus, Minus, Target } from 'lucide-react';

export default function ZoomWheel() {
    const { scale, zoomAt } = useCanvasStore();

    // Use 0.65 as the base (1:1 visual feels like scale 0.65)
    // Display should be relative to 0.65
    const BASE_SCALE = 0.65;

    // Slider range mapping:
    // We'll map value 0 (scale 0.1) to 100 (scale 1.3, which is 200% of base)
    const toSlider = (s: number) => {
        return ((s - 0.1) / (1.3 - 0.1)) * 100;
    };

    const fromSlider = (v: number) => {
        return 0.1 + (v / 100) * (1.3 - 0.1);
    };

    const handleZoom = (newScale: number) => {
        if (typeof window === 'undefined') return;
        zoomAt(newScale, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
    };

    const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
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
                    {Math.round((scale / BASE_SCALE) * 100)}%
                </div>
            </div>

            <button className={styles.btn} onClick={() => handleZoom(scale * 0.9)}>
                <Minus size={18} />
            </button>

            <button
                className={styles.resetBtn}
                onClick={() => handleZoom(0.65)}
                data-tooltip="Reset to 100%"
                data-tooltip-pos="left"
            >
                <Target size={18} />
            </button>
        </div>
    );
}
