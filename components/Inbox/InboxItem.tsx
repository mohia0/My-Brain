import React from 'react';
import { FileText, Link, Image as ImageIcon, ArrowRight } from 'lucide-react';
import styles from './Inbox.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useDraggable } from '@dnd-kit/core';
import { useCanvasStore } from '@/lib/store/canvasStore';
import clsx from 'clsx';

interface InboxItemProps {
    item: any;
    isOverlay?: boolean;
    onClick?: () => void;
}

export default function InboxItem({ item, isOverlay, onClick }: InboxItemProps) {
    const { updateItemContent } = useItemsStore();
    const { scale, position } = useCanvasStore();

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: item.id,
        data: { ...item, origin: 'inbox' }
    });

    // If it's being dragged in the Inbox list, we hide it (visuals move to Overlay)
    // If it's the Overlay itself, we show it fully opaque
    const opacity = isDragging && !isOverlay ? 0.3 : 1;

    const hasImage = item.type === 'link' && item.metadata?.image;

    const handleMoveToCanvas = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Calculate center of screen
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const cx = (viewportW / 2 - position.x) / scale;
        const cy = (viewportH / 2 - position.y) / scale;

        // Add some "funny" random offset
        const randomOffset = () => (Math.random() - 0.5) * 100;

        updateItemContent(item.id, {
            status: 'active',
            position_x: cx + randomOffset(),
            position_y: cy + randomOffset()
        });
    };

    return (
        <div
            ref={isOverlay ? undefined : setNodeRef}
            {...listeners}
            {...attributes}
            className={clsx(styles.inboxItem, isOverlay && styles.isOverlay)}
            style={{ opacity }}
            onClick={onClick}
        >
            {hasImage ? (
                <div className={styles.richItem}>
                    <img
                        src={item.metadata.image}
                        alt=""
                        className={styles.thumbnail}
                        draggable={false}
                    />
                    <div className={styles.meta}>
                        <div className={styles.titleRow}>
                            <div className={styles.title}>{item.metadata?.title || 'Untitled Link'}</div>

                            <div className={styles.itemDateSmall}>
                                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                        <div className={styles.domain}>{new URL(item.content).hostname}</div>
                    </div>
                </div>
            ) : (
                <div className={styles.simpleItem}>
                    <div className={styles.icon}>
                        {item.type === 'text' && <FileText size={14} />}
                        {item.type === 'link' && <Link size={14} />}
                        {item.type === 'image' && <ImageIcon size={14} />}
                    </div>
                    <div className={styles.titleRow}>
                        <span className={styles.title}>{item.metadata?.title || item.content}</span>

                        <div className={styles.itemDateSmall}>
                            {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                </div>
            )}

            {/* Move Button (Only show if not dragging) */}
            {!isDragging && (
                <button
                    className={styles.moveBtn}
                    onClick={handleMoveToCanvas}
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on button click
                    title="Move to Canvas"
                >
                    <ArrowRight size={14} />
                </button>
            )}
        </div>
    );
}
