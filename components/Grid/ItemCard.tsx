"use client";

import React, { forwardRef } from 'react';
import styles from './ItemCard.module.css';
import { Item } from '@/types';
import { FileText, Link, Image as ImageIcon, Copy, Trash2, Archive } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
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

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }
        onDelete(e);
    };

    const getIcon = () => {
        switch (item.type) {
            case 'link': return <Link size={16} />;
            case 'image': return <ImageIcon size={16} />;
            default: return <FileText size={16} />;
        }
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
        try {
            return new URL(url).hostname;
        } catch {
            return url;
        }
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

    if (item.type === 'link' && !item.metadata?.image) {
        return (
            <div
                id={`draggable-item-${item.id}`}
                ref={ref}
                className={clsx(baseClassName, styles.linkCard)}
                style={finalStyle}
                {...listeners} {...attributes}
                onPointerDown={(e) => { e.stopPropagation(); listeners?.onPointerDown?.(e); }}
                onClick={onClick}
            >
                <div className={styles.header}>
                    <img
                        src={`https://www.google.com/s2/favicons?domain=${safeHostname(item.content)}`}
                        alt=""
                        width={16}
                        height={16}
                        onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                    <span className={styles.title}>{item.metadata?.title || item.content}</span>
                </div>
                {renderActions()}
            </div>
        );
    }

    if (item.type === 'link' && item.metadata?.image) {
        return (
            <div
                id={`draggable-item-${item.id}`}
                ref={ref}
                className={clsx(baseClassName, styles.captureCard)}
                style={finalStyle}
                {...listeners} {...attributes}
                onPointerDown={(e) => { e.stopPropagation(); listeners?.onPointerDown?.(e); }}
                onClick={onClick}
            >
                <img src={item.metadata.image} className={styles.captureThumb} draggable={false} />
                <div className={styles.captureInfo}>
                    <div className={styles.captureTitle}>{item.metadata.title}</div>
                    <div className={styles.captureDomain}>{safeHostname(item.content)}</div>
                    <div className={styles.captureDesc}>{item.metadata.description}</div>
                </div>
                {renderActions()}
            </div>
        );
    }

    return (
        <div
            id={`draggable-item-${item.id}`}
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
                <span className={styles.title}>{item.metadata?.title || 'Untitled'}</span>
            </div>
            <div className={styles.content}>
                {item.type === 'image' ? (
                    <img
                        src={item.content}
                        alt="preview"
                        className={styles.imageContent}
                        draggable={false}
                    />
                ) : (
                    <div style={{ fontSize: '0.8rem', color: '#ccc', maxHeight: 80, overflow: 'hidden', whiteSpace: 'pre-wrap' }}>
                        {(() => {
                            if (item.content.startsWith('[')) {
                                try {
                                    const blocks = JSON.parse(item.content);
                                    return blocks.map((b: any) =>
                                        Array.isArray(b.content)
                                            ? b.content.map((c: any) => c.text).join('')
                                            : b.content || ''
                                    ).join('\n') || "Empty Note";
                                } catch {
                                    return "Invalid Content";
                                }
                            }
                            return item.content;
                        })()}
                    </div>
                )}
            </div>
            {renderActions()}
            <div className={styles.outerDate}>
                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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
