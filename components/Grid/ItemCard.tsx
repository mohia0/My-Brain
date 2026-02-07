"use client";

import React, { forwardRef } from 'react';
import styles from './ItemCard.module.css';
import { Item } from '@/types';
import { FileText, Link, Image as ImageIcon, Copy, Trash2, Archive, Video, Play } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';

interface ItemCardProps {
    item: Item;
    onClick?: () => void;
}

interface ItemCardViewProps {
    item: Item;
    isSelected?: boolean;
    isDimmed?: boolean;
    isDragging?: boolean;
    isOverlay?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    onDuplicate: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    onArchive: (e: React.MouseEvent) => void;
    style?: React.CSSProperties;
    attributes?: any;
    listeners?: any;
}

export const ItemCardView = forwardRef<HTMLDivElement, ItemCardViewProps>(({
    item,
    isSelected,
    isDimmed,
    isDragging,
    isOverlay,
    onClick,
    onDuplicate,
    onDelete,
    onArchive,
    style,
    attributes,
    listeners
}, ref) => {
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [localItem, setLocalItem] = React.useState(item);
    const pollTimer = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        setLocalItem(item);
    }, [item]);

    // Metadata polling for links (like Instagram) that take time to capture
    React.useEffect(() => {
        const needsUpdate = localItem.type === 'link' && !localItem.metadata?.image;
        if (!needsUpdate) return;

        let attempts = 0;
        pollTimer.current = setInterval(async () => {
            attempts++;
            if (attempts > 10) { clearInterval(pollTimer.current!); return; }

            const { data } = await supabase.from('items').select('metadata').eq('id', localItem.id).single();
            if (data?.metadata?.image || data?.metadata?.title) {
                useItemsStore.getState().updateItemContent(localItem.id, { metadata: data.metadata });
                setLocalItem(prev => ({ ...prev, metadata: data.metadata }));
                clearInterval(pollTimer.current!);
            }
        }, 3000);

        return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
    }, [localItem.id, localItem.type, localItem.metadata?.image]);

    const isVideo = localItem.type === 'video' || localItem.metadata?.isVideo;
    const isCapture = localItem.type === 'link' && localItem.metadata?.image;
    const isImage = localItem.type === 'image';

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }
        onDelete(e);
    };

    const getIcon = () => {
        if (isVideo) return <Video size={16} />;
        switch (localItem.type) {
            case 'link': return <Link size={16} />;
            case 'image': return <ImageIcon size={16} />;
            default: return <FileText size={16} />;
        }
    };

    const SyncIndicator = () => {
        if (!localItem.syncStatus || localItem.syncStatus === 'synced') return null;
        return (
            <div className={clsx(styles.syncStatus, styles[localItem.syncStatus])}>
                {localItem.syncStatus === 'syncing' ? '...' : '!'}
            </div>
        );
    };

    const renderActions = () => (
        <div className={styles.actions}>
            <button onClick={onArchive} title="Archive"><Archive size={12} /></button>
            <button onClick={onDuplicate} title="Duplicate"><Copy size={12} /></button>
            <button
                onClick={handleDeleteClick}
                title="Delete"
                className={clsx(styles.deleteAction, isDeleting && styles.confirmDelete)}
                onMouseLeave={() => setIsDeleting(false)}
            >
                {isDeleting ? "Sure?" : <Trash2 size={12} />}
            </button>
        </div>
    );

    const safeHostname = (url: string) => {
        if (!url || !url.startsWith('http')) return null;
        try { return new URL(url).hostname; } catch { return null; }
    };

    const baseClassName = clsx(
        styles.card,
        isSelected && styles.selected,
        isDimmed && styles.dimmed
    );

    const finalStyle = isOverlay ? {
        ...style,
        position: 'relative' as const,
        top: 0,
        left: 0,
        transform: 'none'
    } : style;

    // Video Handling
    if (isVideo) {
        return (
            <div
                id={`draggable-item-${localItem.id}`}
                ref={ref}
                className={clsx(baseClassName, styles.videoCard)}
                style={finalStyle}
                {...listeners} {...attributes}
                onPointerDown={(e) => { e.stopPropagation(); listeners?.onPointerDown?.(e); }}
                onClick={onClick}
            >
                <div className={styles.videoHeader}>
                    <Video size={14} className={styles.videoTagIcon} />
                    <span>Video</span>
                </div>
                <video src={localItem.content} className={styles.videoPreview} muted />
                <div className={styles.videoOverlay}>
                    <Play size={24} fill="white" />
                </div>
                <div className={styles.captureInfo}>
                    <div className={styles.captureTitle}>{localItem.metadata?.title || 'Video Idea'}</div>
                </div>
                {renderActions()}
            </div>
        );
    }

    // Capture (Link with image)
    if (isCapture) {
        return (
            <div
                id={`draggable-item-${localItem.id}`}
                ref={ref}
                className={clsx(baseClassName, styles.captureCard)}
                style={finalStyle}
                {...listeners} {...attributes}
                onPointerDown={(e) => { e.stopPropagation(); listeners?.onPointerDown?.(e); }}
                onClick={onClick}
            >
                <img src={localItem.metadata.image} className={styles.captureThumb} draggable={false} />
                <div className={styles.captureInfo}>
                    <div className={styles.captureTitle}>{localItem.metadata.title}</div>
                    <div className={styles.captureDomain}>{safeHostname(localItem.content)}</div>
                    <div className={styles.captureDesc}>{localItem.metadata.description}</div>
                    <SyncIndicator />
                </div>
                {renderActions()}
            </div>
        );
    }

    // Simple Link (No Image)
    if (localItem.type === 'link') {
        return (
            <div
                id={`draggable-item-${localItem.id}`}
                ref={ref}
                className={clsx(baseClassName, styles.linkCard)}
                style={finalStyle}
                {...listeners} {...attributes}
                onPointerDown={(e) => { e.stopPropagation(); listeners?.onPointerDown?.(e); }}
                onClick={onClick}
            >
                <div className={styles.header}>
                    {safeHostname(localItem.content) && (
                        <img
                            src={`https://www.google.com/s2/favicons?domain=${safeHostname(localItem.content)}`}
                            alt=""
                            width={16}
                            height={16}
                            onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                    )}
                    <span className={styles.title}>{localItem.metadata?.title || localItem.content}</span>
                    <SyncIndicator />
                </div>
                {renderActions()}
            </div>
        );
    }

    // Default (Image or Text Idea)
    return (
        <div
            id={`draggable-item-${localItem.id}`}
            ref={ref}
            className={baseClassName}
            style={finalStyle}
            {...listeners}
            {...attributes}
            onPointerDown={(e) => {
                e.stopPropagation();
                listeners?.onPointerDown?.(e);
            }}
            onClick={onClick}
        >
            <div className={styles.header}>
                {getIcon()}
                <span className={styles.title}>{localItem.metadata?.title || (localItem.type === 'image' ? 'Image' : 'Untitled Idea')}</span>
                <SyncIndicator />
            </div>
            <div className={styles.content}>
                {isImage ? (
                    <img
                        src={localItem.content}
                        alt="preview"
                        className={styles.imageContent}
                        draggable={false}
                    />
                ) : (
                    <div style={{ fontSize: '0.8rem', color: '#ccc', maxHeight: 80, overflow: 'hidden', whiteSpace: 'pre-wrap' }}>
                        {(() => {
                            if (localItem.content.startsWith('[')) {
                                try {
                                    const blocks = JSON.parse(localItem.content);
                                    return blocks.map((b: any) =>
                                        Array.isArray(b.content)
                                            ? b.content.map((c: any) => c.text).join('')
                                            : b.content || ''
                                    ).join('\n') || "Empty Idea";
                                } catch {
                                    return "Invalid Content";
                                }
                            }
                            return localItem.content;
                        })()}
                    </div>
                )}
            </div>
            {renderActions()}
            <div className={styles.outerDate}>
                {new Date(localItem.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
        </div>
    );
});

ItemCardView.displayName = 'ItemCardView';

export default function ItemCard({ item, onClick }: ItemCardProps) {
    const { duplicateItem, removeItem, archiveItem, selectedIds } = useItemsStore();
    const { scale } = useCanvasStore();

    const isSelected = selectedIds.includes(item.id);
    const isDimmed = selectedIds.length > 1 && !isSelected;

    const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
        id: item.id,
        data: { ...item, type: 'item' }
    });

    const handleDuplicate = (e: React.MouseEvent) => {
        e.stopPropagation();
        duplicateItem(item.id);
    };

    const handleDelete = (e: React.MouseEvent) => {
        removeItem(item.id);
    };

    const handleArchive = (e: React.MouseEvent) => {
        archiveItem(item.id);
    };

    const dragStyle: React.CSSProperties = {
        left: item.position_x,
        top: item.position_y,
        opacity: 1,
        zIndex: isDragging ? 1000 : undefined,
        transform: transform ? `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)` : undefined
    };

    const handleClick = (e: React.MouseEvent) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            useItemsStore.getState().toggleSelection(item.id);
        } else {
            useItemsStore.getState().selectItem(item.id);
            onClick?.();
        }
    };

    return (
        <ItemCardView
            ref={setNodeRef}
            item={item}
            isSelected={isSelected}
            isDimmed={isDimmed}
            isDragging={isDragging}
            onClick={handleClick}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onArchive={handleArchive}
            attributes={attributes}
            listeners={listeners}
            style={dragStyle}
        />
    );
}
