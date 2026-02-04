"use client";

import React from 'react';
import styles from './ItemCard.module.css';
import { Item } from '@/types';
import { FileText, Link, Image as ImageIcon, Copy, Trash2 } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { useItemsStore } from '@/lib/store/itemsStore';
import clsx from 'clsx';

interface ItemCardProps {
    item: Item;
    onClick?: () => void;
}

export default function ItemCard({ item, onClick }: ItemCardProps) {
    const { duplicateItem, removeItem, selectedIds } = useItemsStore();

    const isSelected = selectedIds.includes(item.id);
    const isDimmed = selectedIds.length > 0 && !isSelected;

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: item.id,
        data: { ...item } // Pass item data for drag handlers
    });

    // Create transform style but exclude scale to avoid double-scaling if canvas is scaled
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleDuplicate = (e: React.MouseEvent) => {
        e.stopPropagation();
        duplicateItem(item.id);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }
        removeItem(item.id);
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
            <button onClick={handleDuplicate} title="Duplicate"><Copy size={12} /></button>
            <button
                onClick={handleDelete}
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

    // Render Link Card (Compact)
    if (item.type === 'link' && !item.metadata?.image) {
        return (
            <div
                ref={setNodeRef}
                className={clsx(styles.card, styles.linkCard, isSelected && styles.selected, isDimmed && styles.dimmed)}
                style={{ left: item.position_x, top: item.position_y, ...style }}
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

    // Render Web Capture Card (Horizontal)
    if (item.type === 'link' && item.metadata?.image) {
        return (
            <div
                ref={setNodeRef}
                className={clsx(styles.card, styles.captureCard, isSelected && styles.selected, isDimmed && styles.dimmed)}
                style={{ left: item.position_x, top: item.position_y, ...style }}
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
            ref={setNodeRef}
            className={styles.card}
            style={{
                left: item.position_x,
                top: item.position_y,
                ...style
            }}
            {...listeners}
            {...attributes}
            onPointerDown={(e) => {
                // Prevent drag from propagating to canvas pan
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
                                    // Extract text from blocks
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
        </div>
    );
}
