"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { useItemsStore } from '@/lib/store/itemsStore';
import styles from './Canvas.module.css';

// Fixed Canvas Size (Figma-like artboard)
const CANVAS_SIZE = 5000;
const HALF_SIZE = CANVAS_SIZE / 2;

export default function Canvas({ children }: { children: React.ReactNode }) {
    const { scale, position, setPosition, setScale } = useCanvasStore();
    const { items, setSelection, clearSelection, addItem } = useItemsStore();

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const worldRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // State
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, x: number, y: number, width: number, height: number } | null>(null);
    const [isSpacePressed, setIsSpacePressed] = useState(false);

    // Initial load - Center canvas
    useEffect(() => {
        // Only center if position is 0,0 (initial)
        if (position.x === 0 && position.y === 0) {
            // Center viewport on the "Artboard"
            // The artboard is from -HALF_SIZE to +HALF_SIZE
            // We want center (0,0) to be in middle of screen
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
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false);
                isDragging.current = false; // Stop dragging if space is released
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        window.addEventListener('keyup', handleKeyUp, { capture: true });

        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            window.removeEventListener('keyup', handleKeyUp, { capture: true });
        };
    }, []);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const zoomSensitivity = 0.001;
            const newScale = Math.min(Math.max(scale - e.deltaY * zoomSensitivity, 0.1), 5);
            setScale(newScale);
        } else {
            // Pan with wheel (standard touchpad behavior)
            let newX = position.x - e.deltaX;
            let newY = position.y - e.deltaY;

            // Strict Limits
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
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1 || isSpacePressed) {
            // Pan Mode
            e.preventDefault();
            isDragging.current = true;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
            return;
        }

        if (e.button === 0) {
            // Left Click behavior
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
            // Prevent panning "void" into view.
            // Left Edge (-2500) must be <= 0 (Screen Left)
            // Right Edge (2500) must be >= Viewport Width

            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;

            const minX = viewportW - (HALF_SIZE * scale);
            const maxX = HALF_SIZE * scale;

            const minY = viewportH - (HALF_SIZE * scale);
            const maxY = HALF_SIZE * scale;

            if (minX > maxX) {
                // Content smaller than viewport -> Center it
                newX = viewportW / 2;
            } else {
                if (newX < minX) newX = minX;
                if (newX > maxX) newX = maxX;
            }

            if (minY > maxY) {
                // Content smaller than viewport -> Center it
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
        if (containerRef.current) {
            containerRef.current.style.cursor = isSpacePressed ? 'grab' : 'default';
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

    const gridSize = 40 * scale;
    const backgroundPosition = `${position.x}px ${position.y}px`;

    return (
        <div
            className={styles.container}
            ref={containerRef}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
                backgroundSize: `${gridSize}px ${gridSize}px`,
                backgroundPosition: backgroundPosition,
                cursor: isSpacePressed ? (isDragging.current ? 'grabbing' : 'grab') : 'default'
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
                    border: '2px solid rgba(255, 255, 255, 0.1)',
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
        </div>
    );
}
