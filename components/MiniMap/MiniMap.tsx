"use client";

import React from 'react';
import styles from './MiniMap.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { LayoutGrid, ZoomIn, ZoomOut } from 'lucide-react';

export default function MiniMap() {
    const { items, layoutAllItems } = useItemsStore(); // Added layoutAllItems
    const { position, scale, setScale } = useCanvasStore();

    // Constants for map scale
    const MAP_SIZE = 150;
    const WORLD_SIZE = 5000; // Assumed max world size for visualization ratio
    const RATIO = MAP_SIZE / WORLD_SIZE;

    // Viewport rect calculation
    // Viewport rect calculation
    const [mount, setMount] = React.useState(false);

    React.useEffect(() => {
        setMount(true);
    }, []);

    const viewportW = (mount && typeof window !== 'undefined' ? window.innerWidth : 1920) / scale;
    const viewportH = (mount && typeof window !== 'undefined' ? window.innerHeight : 1080) / scale;

    return (
        <div className={styles.wrapper}>
            <button className={styles.organizeBtn} onClick={layoutAllItems} title="Organize All Items">
                <LayoutGrid size={18} />
            </button>

            <div className={styles.mapContainer}>
                <div
                    className={styles.container}
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const clickY = e.clientY - rect.top;

                        // Inverse Mapping: Click -> World
                        // Map Center (75,75) is World (0,0)
                        // x_map = (x_world + 2500) * RATIO
                        // x_world = (x_map / RATIO) - 2500
                        const worldX = (clickX / RATIO) - (WORLD_SIZE / 2);
                        const worldY = (clickY / RATIO) - (WORLD_SIZE / 2);

                        // Center the Canvas on this World Point
                        // screenCenter = world * scale + pos
                        // pos = screenCenter - world * scale
                        const newX = (window.innerWidth / 2) - (worldX * scale);
                        const newY = (window.innerHeight / 2) - (worldY * scale);

                        useCanvasStore.getState().setPosition(newX, newY);
                    }}
                >
                    {/* Center Crosshair (Optional visual guide) */}
                    <div style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: 2, background: 'rgba(255,255,255,0.3)', transform: 'translate(-50%, -50%)' }} />

                    {items.map(item => (
                        <div
                            key={item.id}
                            className={styles.dot}
                            style={{
                                // Map World (0,0) to MiniMap Center (75, 75)
                                // left = (itemX + 2500) * RATIO
                                left: (item.position_x + (WORLD_SIZE / 2)) * RATIO,
                                top: (item.position_y + (WORLD_SIZE / 2)) * RATIO,
                                backgroundColor: item.type === 'link' ? '#6e56cf' : 'var(--accent)'
                            }}
                        />
                    ))}

                    <div
                        className={styles.viewport}
                        style={{
                            // Viewport TopLeft in World = -position / scale
                            // Map to MiniMap: ( (-pos/scale) + 2500 ) * RATIO
                            left: ((-position.x / scale) + (WORLD_SIZE / 2)) * RATIO,
                            top: ((-position.y / scale) + (WORLD_SIZE / 2)) * RATIO,
                            width: viewportW * RATIO,
                            height: viewportH * RATIO
                        }}
                    />
                </div>

                <div className={styles.zoomControl}>
                    <input
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={scale}
                        onChange={(e) => setScale(parseFloat(e.target.value))}
                        className={styles.slider}
                    />
                </div>
            </div>
        </div>
    );
}
