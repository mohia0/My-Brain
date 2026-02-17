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

    const getImageUrl = () => {
        if (item.type === 'image') return item.content;
        return item.metadata?.image;
    };
    const hasImage = !!getImageUrl();

    const handleMoveToCanvas = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Calculate center of screen
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const cx = (viewportW / 2 - position.x) / scale;
        const cy = (viewportH / 2 - position.y) / scale;

        // Approximate dimensions to center the item
        let width = 200;
        let height = 130;

        if (item.type === 'image' || (item.type === 'link' && item.metadata?.image)) {
            width = 300;
            height = 200;
        } else if (item.type === 'link') {
            width = 300;
            height = 100;
        }

        updateItemContent(item.id, {
            status: 'active',
            position_x: cx - width / 2,
            position_y: cy - height / 2
        });
    };

    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }
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

    const [imageError, setImageError] = React.useState(false);

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
                    {!imageError ? (
                        <img
                            src={getImageUrl()!}
                            alt=""
                            className={styles.thumbnail}
                            draggable={false}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className={styles.noSnapshotSmall}>
                            <ImageIcon size={14} />
                        </div>
                    )}
                    <div className={styles.meta}>
                        <div className={styles.titleRow}>
                            <div
                                ref={titleRef}
                                className={clsx(styles.title, isOverflowing && styles.canAnimate)}
                            >
                                {(() => {
                                    if (item.metadata?.title) return item.metadata.title;

                                    // Fallback: derive title from content
                                    let displayContent = item.content;
                                    if (displayContent.startsWith('[') || displayContent.startsWith('{')) {
                                        try {
                                            const blocks = JSON.parse(displayContent);
                                            displayContent = Array.isArray(blocks)
                                                ? blocks.map((b: any) => Array.isArray(b.content) ? b.content.map((c: any) => c.text).join('') : b.content || '').join(' ')
                                                : displayContent;
                                        } catch { }
                                    }

                                    const clean = displayContent.trim();
                                    if (!clean) return 'Untitled Idea';
                                    return clean.length > 50 ? clean.substring(0, 50) + '...' : clean;
                                })()}
                            </div>
                        </div>
                        <div className={styles.infoRow}>
                            <div className={styles.domain}>
                                {(() => {
                                    try {
                                        return new URL(item.content).hostname;
                                    } catch {
                                        return 'Link';
                                    }
                                })()}
                            </div>
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
                                {(() => {
                                    if (item.metadata?.title) return item.metadata.title;

                                    // Fallback: derive title from content
                                    let displayContent = item.content;
                                    if (displayContent.startsWith('[') || displayContent.startsWith('{')) {
                                        try {
                                            const blocks = JSON.parse(displayContent);
                                            displayContent = Array.isArray(blocks)
                                                ? blocks.map((b: any) => Array.isArray(b.content) ? b.content.map((c: any) => c.text).join('') : b.content || '').join(' ')
                                                : displayContent;
                                        } catch { }
                                    }

                                    const clean = displayContent.trim();
                                    if (!clean) return item.type === 'link' ? item.content : 'Untitled Idea';
                                    return clean.length > 50 ? clean.substring(0, 50) + '...' : clean;
                                })()}
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
                        data-tooltip="Move to Canvas"
                        data-tooltip-pos="left"
                    >
                        <ArrowRight size={14} />
                    </button>
                    <button
                        className={clsx(styles.actionBtn, styles.removeBtn, isDeleting && styles.confirmDelete)}
                        onClick={handleRemove}
                        onMouseLeave={() => setIsDeleting(false)}
                    >
                        {isDeleting ? <span className={styles.sureText}>Sure?</span> : <Trash2 size={14} />}
                    </button>
                </div>
            )}
        </div>
    );
}
