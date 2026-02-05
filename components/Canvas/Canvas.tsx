"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { useItemsStore } from '@/lib/store/itemsStore';
import styles from './Canvas.module.css';
import { Undo, Redo } from 'lucide-react';

// Fixed Canvas Size (Figma-like artboard)
const CANVAS_SIZE = 5000;
const HALF_SIZE = CANVAS_SIZE / 2;

export default function Canvas({ children }: { children: React.ReactNode }) {
    const { scale, position, setPosition, setScale, currentTool } = useCanvasStore();
    const { items, setSelection, clearSelection, addItem, undo, redo, history } = useItemsStore();

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const worldRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // State
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, x: number, y: number, width: number, height: number } | null>(null);
    const [isSpacePressed, setIsSpacePressed] = useState(false);

    // Cursor State
    const [cursor, setCursor] = useState('default');

    // Sync cursor with tool
    useEffect(() => {
        if (currentTool === 'hand' || isSpacePressed) {
            setCursor('grab');
        } else {
            setCursor('default');
        }
    }, [currentTool, isSpacePressed]);

    // Initial load - Center canvas
    useEffect(() => {
        if (position.x === 0 && position.y === 0) {
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;
            setPosition(viewportW / 2, viewportH / 2);
        }
    }, []);

    // Global Event Listeners for Spacebar
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault(); // Prevent scrolling
                setIsSpacePressed(true);
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false);
                isDragging.current = false; // Stop dragging if space is released
                if (currentTool !== 'hand') setCursor('default');
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        window.addEventListener('keyup', handleKeyUp, { capture: true });

        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            window.removeEventListener('keyup', handleKeyUp, { capture: true });
        };
    }, [currentTool, undo, redo]);

    // Native Wheel Event Listener (Non-passive for preventing browser zoom)
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                // Multiplicative zoom for smooth feeling (like Google Maps/Figma)
                const zoomFactor = -e.deltaY * 0.002;
                const currentScale = useCanvasStore.getState().scale;
                const newScale = Math.min(Math.max(currentScale * (1 + zoomFactor), 0.1), 5); // 0.1 to 5 scale limits

                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;
                    useCanvasStore.getState().zoomAt(newScale, { x: mouseX, y: mouseY });
                }
            } else {
                // Pan with wheel
                const currentPos = useCanvasStore.getState().position;
                const currentScale = useCanvasStore.getState().scale;

                let newX = currentPos.x - e.deltaX;
                let newY = currentPos.y - e.deltaY;

                // Strict limits logic
                const viewportW = window.innerWidth;
                const viewportH = window.innerHeight;
                const HALF_SIZE = 2500;

                const minX = viewportW - (HALF_SIZE * currentScale);
                const maxX = HALF_SIZE * currentScale;

                const minY = viewportH - (HALF_SIZE * currentScale);
                const maxY = HALF_SIZE * currentScale;

                if (minX <= maxX) {
                    newX = Math.max(minX, Math.min(maxX, newX));
                } else {
                    newX = viewportW / 2;
                }

                if (minY <= maxY) {
                    newY = Math.max(minY, Math.min(maxY, newY));
                } else {
                    newY = viewportH / 2;
                }

                useCanvasStore.getState().setPosition(newX, newY);
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
        }

        return () => {
            if (container) {
                container.removeEventListener('wheel', handleWheel);
            }
        };
    }, []);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        // Middle Mouse or Spacebar always Pans
        if (e.button === 1 || isSpacePressed) {
            e.preventDefault();
            isDragging.current = true;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            setCursor('grabbing');
            return;
        }

        if (e.button === 0) {
            // Hand Tool Logic -> Pan
            if (currentTool === 'hand') {
                e.preventDefault();
                // Clear selection if clicking void
                if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                    clearSelection();
                }
                isDragging.current = true;
                lastMousePos.current = { x: e.clientX, y: e.clientY };
                setCursor('grabbing');
                return;
            }

            // Mouse Tool Logic -> Selection
            if (e.target === containerRef.current || e.target === worldRef.current) {
                // Background Click

                // 1. Clear selection if no modifiers
                if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                    clearSelection();
                }

                // 2. Start Selection Box
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    setSelectionBox({ startX: x, startY: y, x, y, width: 0, height: 0 });
                }
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        // Panning Logic
        if (isDragging.current) {
            const dx = e.clientX - lastMousePos.current.x;
            const dy = e.clientY - lastMousePos.current.y;

            let newX = position.x + dx;
            let newY = position.y + dy;

            // --- Strict Limits ---
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;

            const minX = viewportW - (HALF_SIZE * scale);
            const maxX = HALF_SIZE * scale;

            const minY = viewportH - (HALF_SIZE * scale);
            const maxY = HALF_SIZE * scale;

            if (minX > maxX) {
                newX = viewportW / 2;
            } else {
                if (newX < minX) newX = minX;
                if (newX > maxX) newX = maxX;
            }

            if (minY > maxY) {
                newY = viewportH / 2;
            } else {
                if (newY < minY) newY = minY;
                if (newY > maxY) newY = maxY;
            }

            setPosition(newX, newY);
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            return;
        }

        // Selection Box Logic
        if (selectionBox) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const currentX = e.clientX - rect.left;
                const currentY = e.clientY - rect.top;

                const x = Math.min(selectionBox.startX, currentX);
                const y = Math.min(selectionBox.startY, currentY);
                const width = Math.abs(currentX - selectionBox.startX);
                const height = Math.abs(currentY - selectionBox.startY);

                setSelectionBox({ ...selectionBox, x, y, width, height });

                // Calculate Intersection
                const worldX = (x - position.x) / scale;
                const worldY = (y - position.y) / scale;
                const worldW = width / scale;
                const worldH = height / scale;

                const selected = items.filter(item => {
                    const itemW = 200; // Approx
                    const itemH = 100;
                    return (
                        item.position_x < worldX + worldW &&
                        item.position_x + itemW > worldX &&
                        item.position_y < worldY + worldH &&
                        item.position_y + itemH > worldY
                    );
                }).map(i => i.id);

                setSelection(selected);
            }
        }
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        setSelectionBox(null);
        if (currentTool === 'hand' || isSpacePressed) {
            setCursor('grab');
        } else {
            setCursor('default');
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        let dropX = (e.clientX - rect.left - position.x) / scale;
        let dropY = (e.clientY - rect.top - position.y) / scale;

        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target?.result as string;
                    addItem({
                        id: crypto.randomUUID(),
                        user_id: 'user-1',
                        type: 'image',
                        content,
                        position_x: dropX,
                        position_y: dropY,
                        created_at: new Date().toISOString(),
                        metadata: { title: file.name }
                    });
                    dropX += 20; dropY += 20;
                };
                reader.readAsDataURL(file);
            }
        }
    };

    return (
        <div
            className={styles.container}
            ref={containerRef}
            onContextMenu={handleContextMenu}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
                cursor: selectionBox ? 'crosshair' : cursor
            }}
        >
            <div
                ref={worldRef}
                className={styles.world}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: '0 0'
                }}
            >
                {/* Visual Board Boundaries */}
                <div style={{
                    position: 'absolute',
                    left: -HALF_SIZE,
                    top: -HALF_SIZE,
                    width: CANVAS_SIZE,
                    height: CANVAS_SIZE,
                    backgroundColor: 'var(--background)', // Keep board original color
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    backgroundImage: 'radial-gradient(#333 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    pointerEvents: 'none',
                    zIndex: -1
                }} />

                {children}
            </div>

            {selectionBox && (
                <div
                    style={{
                        position: 'absolute',
                        left: selectionBox.x,
                        top: selectionBox.y,
                        width: selectionBox.width,
                        height: selectionBox.height,
                        border: '1px solid var(--accent)',
                        background: 'rgba(110, 86, 207, 0.1)',
                        pointerEvents: 'none',
                        zIndex: 9999
                    }}
                />
            )}

            {/* Minimalist Undo/Redo Controls */}
            <div style={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                display: 'flex',
                gap: 6,
                zIndex: 1000,
            }}>
                <button
                    onClick={undo}
                    disabled={history?.past.length === 0}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'rgba(20, 20, 20, 0.6)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        color: history?.past.length > 0 ? '#eee' : '#444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: history?.past.length > 0 ? 'pointer' : 'default',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        if (history?.past.length > 0) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(20, 20, 20, 0.6)';
                        e.currentTarget.style.transform = 'none';
                    }}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo size={16} />
                </button>
                <button
                    onClick={redo}
                    disabled={history?.future.length === 0}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'rgba(20, 20, 20, 0.6)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        color: history?.future.length > 0 ? '#eee' : '#444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: history?.future.length > 0 ? 'pointer' : 'default',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        if (history?.future.length > 0) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(20, 20, 20, 0.6)';
                        e.currentTarget.style.transform = 'none';
                    }}
                    title="Redo (Ctrl+Y)"
                >
                    <Redo size={16} />
                </button>
            </div>
        </div>
    );
}
