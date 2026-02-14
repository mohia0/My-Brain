"use client";

import React from 'react';
import styles from './MiniMap.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { Map as MapIcon, Minimize2, HelpCircle, X } from 'lucide-react';
import clsx from 'clsx';

export default function MiniMap() {
    const { items, layoutAllItems } = useItemsStore(); // Added layoutAllItems
    const { position, scale, setScale, isMinimapCollapsed, setIsMinimapCollapsed } = useCanvasStore();
    const [showHelp, setShowHelp] = React.useState(false);
    const helpRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
                setShowHelp(false);
            }
        };

        if (showHelp) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showHelp]);

    // ... existing map scale logic ...
    const WORLD_WIDTH = 10000;
    const WORLD_HEIGHT = 5000;
    const MAP_HEIGHT = 125;
    const RATIO = MAP_HEIGHT / WORLD_HEIGHT; // Unified ratio
    const MAP_WIDTH = WORLD_WIDTH * RATIO;

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
        <div className={clsx(styles.wrapper, isMinimapCollapsed && styles.isCollapsed)}>
            {showHelp && (
                <div className={styles.helpModal} ref={helpRef}>
                    <div className={styles.helpHeader}>
                        <h3>Shortcuts & Tips</h3>
                        <button className={styles.closeHelp} onClick={() => setShowHelp(false)}>
                            <X size={14} />
                        </button>
                    </div>

                    <div className={styles.shortcutSection}>
                        <div className={styles.sectionTitle}>Tools</div>
                        <div className={styles.shortcutRow}>
                            <span className={styles.shortcutLabel}>Select Tool</span>
                            <div className={styles.shortcutKeys}><span className={styles.key}>V</span></div>
                        </div>
                        <div className={styles.shortcutRow}>
                            <span className={styles.shortcutLabel}>Hand / Pan Tool</span>
                            <div className={styles.shortcutKeys}><span className={styles.key}>H</span></div>
                        </div>
                    </div>

                    <div className={styles.shortcutSection}>
                        <div className={styles.sectionTitle}>Canvas</div>
                        <div className={styles.shortcutRow}>
                            <span className={styles.shortcutLabel}>Temporary Pan</span>
                            <div className={styles.shortcutKeys}><span className={styles.key}>Space</span></div>
                        </div>
                        <div className={styles.shortcutRow}>
                            <span className={styles.shortcutLabel}>Zoom In/Out</span>
                            <div className={styles.shortcutKeys}><span className={styles.key}>Ctrl</span> <span className={styles.key}>Scroll</span></div>
                        </div>
                    </div>

                    <div className={styles.shortcutSection}>
                        <div className={styles.sectionTitle}>Selection</div>
                        <div className={styles.shortcutRow}>
                            <span className={styles.shortcutLabel}>Multi-select</span>
                            <div className={styles.shortcutKeys}><span className={styles.key}>Ctrl</span> <span className={styles.key}>Click</span></div>
                        </div>
                        <div className={styles.shortcutRow}>
                            <span className={styles.shortcutLabel}>Box Selection</span>
                            <span className={styles.shortcutLabel}>Drag on Background</span>
                        </div>
                    </div>

                    <div className={styles.shortcutSection}>
                        <div className={styles.sectionTitle}>History</div>
                        <div className={styles.shortcutRow}>
                            <span className={styles.shortcutLabel}>Undo</span>
                            <div className={styles.shortcutKeys}><span className={styles.key}>Ctrl</span> <span className={styles.key}>Z</span></div>
                        </div>
                        <div className={styles.shortcutRow}>
                            <span className={styles.shortcutLabel}>Redo</span>
                            <div className={styles.shortcutKeys}><span className={styles.key}>Ctrl</span> <span className={styles.key}>Y</span></div>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.controls}>
                <button
                    className={styles.toggleBtn}
                    onClick={() => setIsMinimapCollapsed(!isMinimapCollapsed)}
                    data-tooltip={isMinimapCollapsed ? "Open MiniMap" : "Close MiniMap"}
                    data-tooltip-pos="top-right"
                >
                    {isMinimapCollapsed ? <MapIcon size={14} strokeWidth={2.5} /> : <Minimize2 size={14} strokeWidth={2.5} />}
                </button>

                <button
                    className={styles.helpBtn}
                    onClick={() => setShowHelp(!showHelp)}
                    data-tooltip="Shortcuts Help"
                    data-tooltip-pos="top"
                >
                    <HelpCircle size={14} />
                </button>
            </div>

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

                {items.filter(i => !i.folder_id && i.status !== 'inbox').map(item => (
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
                {useItemsStore.getState().folders.filter(f => !f.parent_id).map(folder => (
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
    );
}
