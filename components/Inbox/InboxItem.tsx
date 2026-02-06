import React from 'react';
import { FileText, Link, Image as ImageIcon, ArrowRight, Trash2 } from 'lucide-react';
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
    const { updateItemContent, selectedIds, selectItem, toggleSelection, removeItem } = useItemsStore();
    const { scale, position } = useCanvasStore();
    const titleRef = React.useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = React.useState(false);

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: item.id,
        data: { ...item, origin: 'inbox' }
    });

    React.useEffect(() => {
        const checkOverflow = () => {
            if (titleRef.current) {
                const isOver = titleRef.current.scrollWidth > titleRef.current.clientWidth;
                setIsOverflowing(isOver);
            }
        };

        checkOverflow();
        // Recalculate if window resizes (since sidebar width might change or be fixed)
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [item.metadata?.title, item.content]);

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

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        removeItem(item.id);
    };

    const isSelected = selectedIds.includes(item.id);

    const handleClick = (e: React.MouseEvent) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            e.stopPropagation();
            toggleSelection(item.id);
        } else {
            // Normal click opens the modal via the parent trigger, but let's also select
            selectItem(item.id);
            onClick?.();
        }
    };

    return (
        <div
            ref={isOverlay ? undefined : setNodeRef}
            {...listeners}
            {...attributes}
            className={clsx(
                styles.inboxItem,
                isOverlay && styles.isOverlay,
                isSelected && styles.selected
            )}
            style={{ opacity }}
            onClick={handleClick}
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
                            <div
                                ref={titleRef}
                                className={clsx(styles.title, isOverflowing && styles.canAnimate)}
                            >
                                {item.metadata?.title || 'Untitled Link'}
                            </div>
                        </div>
                        <div className={styles.infoRow}>
                            <div className={styles.domain}>{new URL(item.content).hostname}</div>
                            <div className={styles.itemDateSmall}>
                                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.simpleItem}>
                    <div className={styles.icon}>
                        {item.type === 'text' && <FileText size={14} />}
                        {item.type === 'link' && <Link size={14} />}
                        {item.type === 'image' && <ImageIcon size={14} />}
                    </div>
                    <div className={styles.meta}>
                        <div className={styles.titleRow}>
                            <span
                                ref={titleRef}
                                className={clsx(styles.title, isOverflowing && styles.canAnimate)}
                            >
                                {item.metadata?.title || item.content}
                            </span>
                        </div>
                        <div className={styles.itemDateSmall}>
                            {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons (Only show if not dragging) */}
            {!isDragging && (
                <div className={styles.actions} onPointerDown={(e) => e.stopPropagation()}>
                    <button
                        className={styles.actionBtn}
                        onClick={handleMoveToCanvas}
                        title="Move to Canvas"
                    >
                        <ArrowRight size={14} />
                    </button>
                    <button
                        className={clsx(styles.actionBtn, styles.removeBtn)}
                        onClick={handleRemove}
                        title="Remove"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
