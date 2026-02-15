"use client";

import React from 'react';
import styles from './MiniMap.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { Map as MapIcon, Minimize2, HelpCircle, X, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

export default function MiniMap() {
    const { items, folders, roomHistory, exitRoom } = useItemsStore(); // Increased destructuring
    const { position, scale, setScale, isMinimapCollapsed, setIsMinimapCollapsed, setPosition } = useCanvasStore();

    // Determine destination for tooltip
    const lastRoom = roomHistory[roomHistory.length - 1];
    const destinationTitle = lastRoom ? lastRoom.title : 'Canvas';
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

    const ROOM_WIDTH = 5000;
    const ROOM_HEIGHT = 2500;

    const currentRoomId = useItemsStore.getState().currentRoomId; // Get current room ID
    const CURRENT_WORLD_WIDTH = currentRoomId ? ROOM_WIDTH : WORLD_WIDTH;
    const CURRENT_WORLD_HEIGHT = currentRoomId ? ROOM_HEIGHT : WORLD_HEIGHT;

    const MAP_HEIGHT = 125;
    const RATIO = MAP_HEIGHT / CURRENT_WORLD_HEIGHT; // Unified ratio based on current world
    const MAP_WIDTH = CURRENT_WORLD_WIDTH * RATIO;

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

        const worldX = (clickX / RATIO) - (CURRENT_WORLD_WIDTH / 2);
        const worldY = (clickY / RATIO) - (CURRENT_WORLD_HEIGHT / 2);

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

                {useItemsStore.getState().currentRoomId && (
                    <button
                        className={styles.homeBtn}
                        onClick={() => {
                            exitRoom();
                            setPosition(window.innerWidth / 2, window.innerHeight / 2);
                            setScale(0.65);
                        }}
                        data-tooltip={`Return to ${destinationTitle}`}
                        data-tooltip-pos="top"
                    >
                        <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                )}
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

                {/* Areas / Projects */}
                {mount && items.filter(i => {
                    const room = useItemsStore.getState().currentRoomId;
                    return (i.room_id || null) === room && i.type === 'project' && i.status !== 'inbox';
                }).map(item => (
                    <div
                        key={item.id}
                        className={clsx(styles.area, styles.fadeIn)}
                        style={{
                            left: (item.position_x + (CURRENT_WORLD_WIDTH / 2)) * RATIO,
                            top: (item.position_y + (CURRENT_WORLD_HEIGHT / 2)) * RATIO,
                            width: (item.metadata?.width || 300) * RATIO,
                            height: (item.metadata?.height || 200) * RATIO
                        }}
                    />
                ))}

                {/* Items & Rooms */}
                {mount && items.filter(i => {
                    const room = useItemsStore.getState().currentRoomId;
                    return (i.room_id || null) === room && !i.folder_id && i.status !== 'inbox' && i.type !== 'project';
                }).map(item => {
                    const isRoom = item.type === 'room';

                    // Simple logic for accurate dimensions on map
                    let w = 250;
                    let h = 100;
                    if (item.type === 'link') {
                        w = 280; h = item.metadata?.image ? 100 : 40;
                    } else if (item.type === 'image') {
                        w = 200; h = 200;
                    } else if (item.type === 'room') {
                        w = 220; h = 220;
                    }

                    // Respect metadata overrides
                    w = item.metadata?.width || w;
                    h = item.metadata?.height || h;

                    return (
                        <div
                            key={item.id}
                            className={clsx(isRoom ? styles.room : styles.card, styles.fadeIn)}
                            style={{
                                left: (item.position_x + (CURRENT_WORLD_WIDTH / 2)) * RATIO,
                                top: (item.position_y + (CURRENT_WORLD_HEIGHT / 2)) * RATIO,
                                width: isRoom ? 6 : w * RATIO,
                                height: isRoom ? 9 : h * RATIO,
                                backgroundColor: isRoom ? undefined : 'var(--accent)'
                            }}
                        >
                            {isRoom && <div className={styles.roomLock} />}
                        </div>
                    );
                })}

                {/* Folders as small rectangles (scaled) */}
                {mount && useItemsStore.getState().folders.filter(f => {
                    const room = useItemsStore.getState().currentRoomId;
                    return (f.room_id || null) === room && !f.parent_id;
                }).map(folder => (
                    <div
                        key={folder.id}
                        className={clsx(styles.card, styles.fadeIn)}
                        style={{
                            left: (folder.position_x + (CURRENT_WORLD_WIDTH / 2)) * RATIO,
                            top: (folder.position_y + (CURRENT_WORLD_HEIGHT / 2)) * RATIO,
                            width: 280 * RATIO,
                            height: 120 * RATIO,
                            backgroundColor: 'var(--accent)'
                        }}
                    />
                ))}

                <div
                    className={styles.viewport}
                    style={{
                        left: ((-position.x / scale) + (CURRENT_WORLD_WIDTH / 2)) * RATIO,
                        top: ((-position.y / scale) + (CURRENT_WORLD_HEIGHT / 2)) * RATIO,
                        width: viewportW * RATIO,
                        height: viewportH * RATIO,
                        opacity: mount ? 1 : 0,
                        transition: 'opacity 0.3s ease'
                    }}
                />
            </div>

            <div className={styles.versionText}>VER 1.07 Beta</div>
        </div>
    );
}
