import React from 'react';
import { Item } from '@/types';
import { FileText, Link as LinkIcon, Image as ImageIcon, ArrowRight, Trash2 } from 'lucide-react';
import styles from './MobileInbox.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import clsx from 'clsx';

interface MobileInboxItemProps {
    item: Item;
    onClick?: () => void;
}

export default function MobileInboxItem({ item, onClick }: MobileInboxItemProps) {
    const { updateItemContent, removeItem, toggleSelection, selectedIds } = useItemsStore();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isRemoving, setIsRemoving] = React.useState(false);
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
    const isSelected = selectedIds.includes(item.id);
    const inSelectionMode = selectedIds.length > 0;
    const isImage = (item.type === 'link' && item.metadata?.image) || item.type === 'image';

    const getImageUrl = () => {
        if (item.type === 'image') return item.content;
        return item.metadata?.image;
    };

    const getStatus = () => {
        if (item.type === 'link' && !item.metadata?.title) return 'Capturing...';
        if (item.type === 'image') {
            const isLocal = !item.content ||
                item.content.startsWith('content:') ||
                item.content.startsWith('file:') ||
                item.content.startsWith('data:');
            if (isLocal) return 'Saving...';
        }
        return null;
    };

    const hostname = (url: string | undefined) => {
        if (!url) return 'Idea';
        try { return new URL(url).hostname; } catch { return 'Idea'; }
    };

    const handleMove = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateItemContent(item.id, { status: 'active' });
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDeleting) {
            setIsDeleting(true);
            setTimeout(() => setIsDeleting(false), 3000);
            return;
        }
        setIsRemoving(true);
        setTimeout(() => removeItem(item.id), 300);
    };

    const handleTouchStart = () => {
        longPressTimer.current = setTimeout(() => {
            toggleSelection(item.id);
            if (window.navigator.vibrate) window.navigator.vibrate(50);
        }, 600);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    const handleClick = (e: React.MouseEvent) => {
        if (inSelectionMode) {
            e.stopPropagation();
            toggleSelection(item.id);
            return;
        }

        // Check if it's a link or an image with an external link
        const externalUrl = item.type === 'link' ? item.content : item.metadata?.url;
        if (externalUrl && (externalUrl.startsWith('http') || externalUrl.startsWith('https'))) {
            window.open(externalUrl, '_blank');
            return;
        }

        onClick?.();
    };

    return (
        <div
            className={clsx(
                styles.itemCard,
                isRemoving && styles.removing,
                isSelected && styles.selected
            )}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
        >
            <div className={styles.itemMain}>
                {isImage && getImageUrl() ? (
                    <div className={styles.verticalImageLayout}>
                        <img src={getImageUrl()!} alt="" className={styles.fullThumb} />
                        <div className={styles.info}>
                            <div className={styles.title}>{item.metadata?.title || (item.type === 'image' ? 'Image Idea' : 'Shared Idea')}</div>
                            <div className={styles.subRow}>
                                <span className={styles.sub}>{item.type === 'link' ? hostname(item.content) : 'Image'}</span>
                                {getStatus() && <span className={styles.statusInfo}>{getStatus()}</span>}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.simpleLayout}>
                        <div className={styles.iconBox}>
                            {item.type === 'text' && <FileText size={18} />}
                            {item.type === 'link' && <LinkIcon size={18} />}
                            {item.type === 'image' && <ImageIcon size={18} />}
                        </div>
                        <div className={styles.info}>
                            <div className={styles.title}>{item.metadata?.title || item.content.slice(0, 50) || 'Idea'}</div>
                            <div className={styles.subRow}>
                                <span className={styles.sub}>
                                    {item.type === 'link' ? hostname(item.content) : 'Idea'}
                                </span>
                                {getStatus() && <span className={styles.statusInfo}>{getStatus()}</span>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.itemActions}>
                <button className={styles.actionBtn} onClick={handleMove} title="Move to Brainia">
                    <ArrowRight size={18} />
                </button>
                <button
                    className={clsx(styles.actionBtn, styles.removeBtn, isDeleting && styles.confirmDelete)}
                    onClick={handleRemove}
                    title="Remove"
                >
                    {isDeleting ? <span className={styles.sureText}>Sure?</span> : <Trash2 size={18} />}
                </button>
            </div>
        </div>
    );
}
