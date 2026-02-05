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
    const WORLD_WIDTH = 10000;
    const WORLD_HEIGHT = 5000;
    const MAP_HEIGHT = 125;
    const RATIO = MAP_HEIGHT / WORLD_HEIGHT; // Unified ratio
    const MAP_WIDTH = WORLD_WIDTH * RATIO;

    // Viewport rect calculation
    // Viewport rect calculation
    const [mount, setMount] = React.useState(false);

    React.useEffect(() => {
        setMount(true);
    }, []);

    const viewportW = (mount && typeof window !== 'undefined' ? window.innerWidth : 1920) / scale;
    const viewportH = (mount && typeof window !== 'undefined' ? window.innerHeight : 1080) / scale;

    const isDragging = React.useRef(false);

    const handleMapMove = (clientX: number, clientY: number, currentTarget: HTMLElement) => {
        const rect = currentTarget.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const clickY = clientY - rect.top;

        const worldX = (clickX / RATIO) - (WORLD_WIDTH / 2);
        const worldY = (clickY / RATIO) - (WORLD_HEIGHT / 2);

        const newX = (window.innerWidth / 2) - (worldX * scale);
        const newY = (window.innerHeight / 2) - (worldY * scale);

        useCanvasStore.getState().setPosition(newX, newY);
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.mapContainer}>
                <div
                    className={styles.container}
                    style={{ width: MAP_WIDTH, height: MAP_HEIGHT, cursor: 'crosshair' }}
                    onMouseDown={(e) => {
                        isDragging.current = true;
                        handleMapMove(e.clientX, e.clientY, e.currentTarget);
                    }}
                    onMouseMove={(e) => {
                        if (isDragging.current) {
                            handleMapMove(e.clientX, e.clientY, e.currentTarget);
                        }
                    }}
                    onMouseUp={() => isDragging.current = false}
                    onMouseLeave={() => isDragging.current = false}
                >
                    <div style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: 2, background: 'rgba(255,255,255,0.3)', transform: 'translate(-50%, -50%)' }} />

                    {items.filter(i => i.status !== 'inbox').map(item => (
                        <div
                            key={item.id}
                            className={styles.dot}
                            style={{
                                left: (item.position_x + (WORLD_WIDTH / 2)) * RATIO,
                                top: (item.position_y + (WORLD_HEIGHT / 2)) * RATIO,
                                backgroundColor: 'var(--accent)'
                            }}
                        />
                    ))}

                    {/* Folders as small white dots */}
                    {useItemsStore.getState().folders.map(folder => (
                        <div
                            key={folder.id}
                            className={styles.dot}
                            style={{
                                left: (folder.position_x + (WORLD_WIDTH / 2)) * RATIO,
                                top: (folder.position_y + (WORLD_HEIGHT / 2)) * RATIO,
                                backgroundColor: 'white',
                                opacity: 0.6,
                                width: 3,
                                height: 3
                            }}
                        />
                    ))}

                    <div
                        className={styles.viewport}
                        style={{
                            left: ((-position.x / scale) + (WORLD_WIDTH / 2)) * RATIO,
                            top: ((-position.y / scale) + (WORLD_HEIGHT / 2)) * RATIO,
                            width: viewportW * RATIO,
                            height: viewportH * RATIO
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
