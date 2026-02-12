import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { Item } from '@/types';
import styles from './ProjectArea.module.css';
import clsx from 'clsx';
import { Trash2, Palette, Lock, Unlock, Scaling } from 'lucide-react';

const COLORS = ['default', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];

interface ProjectAreaProps {
    item: Item;
}

export default function ProjectArea({ item }: ProjectAreaProps) {
    const { updateItemContent, removeItem, selectedIds, selectItem, toggleSelection } = useItemsStore();
    const { scale, currentTool } = useCanvasStore();
    const [isHovered, setIsHovered] = React.useState(false);
    const [showColorPicker, setShowColorPicker] = React.useState(false);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: item.id,
        data: { ...item, type: 'project' },
        disabled: currentTool !== 'mouse' || !!item.metadata?.locked
    });

    // Resize Logic
    const handleResizeStart = (e: React.PointerEvent, direction: string) => {
        if (item.metadata?.locked) return;
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = item.metadata?.width || 300;
        const startHeight = item.metadata?.height || 200;

        const handleMouseMove = (moveEvent: PointerEvent) => {
            const dx = (moveEvent.clientX - startX) / scale;
            const dy = (moveEvent.clientY - startY) / scale;

            updateItemContent(item.id, {
                metadata: {
                    ...item.metadata,
                    width: Math.max(100, startWidth + dx),
                    height: Math.max(100, startHeight + dy)
                }
            });
        };

        const handleMouseUp = () => {
            window.removeEventListener('pointermove', handleMouseMove);
            window.removeEventListener('pointerup', handleMouseUp);
        };

        window.addEventListener('pointermove', handleMouseMove);
        window.addEventListener('pointerup', handleMouseUp);
    };

    const style: React.CSSProperties = {
        left: item.position_x,
        top: item.position_y,
        width: item.metadata?.width || 300,
        height: item.metadata?.height || 200,
        transform: transform ? `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)` : undefined,
        zIndex: isDragging ? 50 : 2, // Sufficiently high to catch events, but hopefully below ItemCards (usually 100+)
        backgroundColor: (item.metadata?.color && item.metadata.color !== 'default')
            ? `${item.metadata.color}0D`
            : 'var(--project-area-bg, rgba(128, 128, 128, 0.05))',
        borderColor: (item.metadata?.color && item.metadata.color !== 'default')
            ? item.metadata.color
            : 'var(--border)', // Adaptive border
        cursor: item.metadata?.locked ? 'default' : (isDragging ? 'grabbing' : 'grab')
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateItemContent(item.id, { metadata: { ...item.metadata, title: e.target.value } });
    };

    const handleClick = (e: React.MouseEvent) => {
        if (currentTool !== 'mouse') return;
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            toggleSelection(item.id);
        } else {
            e.stopPropagation();
            selectItem(item.id);
        }
    };

    const isSelected = selectedIds.includes(item.id);

    const toggleColorPicker = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowColorPicker(!showColorPicker);
    };

    const handleColorSelect = (color: string) => {
        updateItemContent(item.id, { metadata: { ...item.metadata, color } });
        setShowColorPicker(false);
    };

    const toggleLock = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateItemContent(item.id, { metadata: { ...item.metadata, locked: !item.metadata?.locked } });
    };

    return (
        <div
            ref={setNodeRef}
            className={clsx(styles.area, isSelected && styles.selected)}
            style={style}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setShowColorPicker(false); }}
            onClick={handleClick}
            {...listeners}
            {...attributes}
        >
            <div className={styles.labelContainer}>
                <input
                    className={styles.labelInput}
                    value={item.metadata?.title || 'Project Area'}
                    onChange={handleLabelChange}
                    onKeyDown={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                    style={{ color: (item.metadata?.color && item.metadata.color !== 'default') ? item.metadata.color : 'var(--foreground)' }}
                />
            </div>

            {isSelected && (
                <div className={styles.controls}>
                    <div style={{ position: 'relative' }}>
                        <button
                            className={styles.controlBtn}
                            onClick={toggleColorPicker}
                            style={{ color: (item.metadata?.color && item.metadata.color !== 'default') ? item.metadata.color : 'var(--foreground)' }}
                            data-tooltip="Color"
                        >
                            <Palette size={14} />
                        </button>
                        {showColorPicker && (
                            <div className={styles.colorPicker} onPointerDown={e => e.stopPropagation()}>
                                {COLORS.map(c => (
                                    <div
                                        key={c}
                                        className={styles.colorOption}
                                        style={{
                                            backgroundColor: c === 'default' ? 'var(--card-bg)' : c,
                                            border: c === 'default' ? '2px solid var(--text-dim)' : 'none'
                                        }}
                                        onClick={(e) => { e.stopPropagation(); handleColorSelect(c); }}
                                        title={c === 'default' ? 'Default' : c}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        className={styles.controlBtn}
                        onClick={toggleLock}
                        data-tooltip={item.metadata?.locked ? "Unlock" : "Lock Position"}
                    >
                        {item.metadata?.locked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                    <button
                        className={clsx(styles.controlBtn, styles.deleteBtn)}
                        onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                        data-tooltip="Delete Area"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
            {isSelected && !item.metadata?.locked && (
                <div
                    className={styles.resizeHandle}
                    onPointerDown={(e) => handleResizeStart(e, 'se')}
                >
                    <Scaling size={12} strokeWidth={3} />
                </div>
            )}
        </div>
    );
}
