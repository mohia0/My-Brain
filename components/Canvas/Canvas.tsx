"use client";

import React, { useRef, useEffect } from 'react';
import { useCanvasStore } from '@/lib/store/canvasStore';
import styles from './Canvas.module.css';

export default function Canvas({ children }: { children: React.ReactNode }) {
    const { scale, position, setPosition, setScale } = useCanvasStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const zoomSensitivity = 0.001;
            const newScale = Math.min(Math.max(scale - e.deltaY * zoomSensitivity, 0.1), 5);
            setScale(newScale);
        } else {
            setPosition(position.x - e.deltaX, position.y - e.deltaY);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only drag if clicking on the background (not items)
        if (e.target === containerRef.current) {
            isDragging.current = true;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            containerRef.current.style.cursor = 'grabbing';
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return;

        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;

        setPosition(position.x + dx, position.y + dy);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        if (containerRef.current) {
            containerRef.current.style.cursor = 'default';
        }
    };

    const gridSize = 40 * scale;
    const backgroundPosition = `${position.x}px ${position.y}px`;

    return (
        <div
            className={styles.container}
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
                backgroundSize: `${gridSize}px ${gridSize}px`,
                backgroundPosition: backgroundPosition
            }}
        >
            <div
                className={styles.world}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: '0 0' // Simplifies coordinate math
                }}
            >
                {children}
            </div>
        </div>
    );
}
