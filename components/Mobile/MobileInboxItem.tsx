import React from 'react';
import { Item } from '@/types';
import { FileText, Link as LinkIcon, Image as ImageIcon, ArrowRight, Trash2, RefreshCw, AlertCircle, Play, Video } from 'lucide-react';
import styles from './MobileInbox.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import clsx from 'clsx';

interface MobileInboxItemProps {
    item: Item;
    onClick?: () => void;
    style?: React.CSSProperties;
}

export default function MobileInboxItem({ item, onClick, style }: MobileInboxItemProps) {
    const { updateItemContent, removeItem, toggleSelection, selectedIds } = useItemsStore();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isRemoving, setIsRemoving] = React.useState(false);
    const [localItem, setLocalItem] = React.useState(item);
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
    const pollTimer = React.useRef<NodeJS.Timeout | null>(null);
    const isSelected = selectedIds.includes(item.id);
    const inSelectionMode = selectedIds.length > 0;
    const isVideo = localItem.type === 'video' || localItem.metadata?.isVideo;
    const isImage = ((localItem.type === 'link' && localItem.metadata?.image) || localItem.type === 'image') && !isVideo;

    // Update local state when item prop changes
    React.useEffect(() => {
        setLocalItem(item);
    }, [item]);

    // Sync with store updates immediately
    React.useEffect(() => {
        setLocalItem(item);
    }, [item]);

    const getImageUrl = () => {
        if (localItem.type === 'image') return localItem.content;
        return localItem.metadata?.image;
    };

    const getStatus = () => {
        if (localItem.type === 'link' && !localItem.metadata?.title) return 'Capturing...';
        if (localItem.type === 'image') {
            const isLocal = !localItem.content ||
                localItem.content.startsWith('content:') ||
                localItem.content.startsWith('file:') ||
                localItem.content.startsWith('data:');
            if (isLocal) return 'Saving...';
        }
        return null;
    };

    const hostname = (url: string | undefined) => {
        if (!url || !url.startsWith('http')) return null;
        try { return new URL(url).hostname; } catch { return null; }
    };

    const handleMove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsRemoving(true); // Re-use removing state for the exit animation
        setTimeout(() => {
            updateItemContent(item.id, { status: 'active' });
        }, 400);
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

        onClick?.();
    };

    const SyncIndicator = () => {
        if (!localItem.syncStatus || localItem.syncStatus === 'synced') return null;

        return (
            <div className={clsx(styles.syncBadge, styles[localItem.syncStatus])}>
                {localItem.syncStatus === 'syncing' ? (
                    <RefreshCw size={10} className={styles.spin} />
                ) : (
                    <AlertCircle size={10} />
                )}
                <span>{localItem.syncStatus === 'syncing' ? 'Syncing...' : 'Error'}</span>
            </div>
        );
    };

    const [imageError, setImageError] = React.useState(false);

    return (
        <div
            className={clsx(
                styles.itemCard,
                isRemoving && styles.removing,
                isDeleting && styles.deleting,
                isSelected && styles.selected
            )}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
            style={style}
        >
            <div className={styles.itemMain}>
                {isVideo ? (
                    <div className={styles.verticalImageLayout}>
                        <div className={styles.videoThumbnailWrapper}>
                            <video src={localItem.content} className={styles.fullThumb} />
                            <div className={styles.playOverlay}><Play size={24} fill="white" /></div>
                        </div>
                        <div className={styles.info}>
                            <div className={styles.titleRow}>
                                <div className={styles.title}>{localItem.metadata?.title || 'Video Idea'}</div>
                                <SyncIndicator />
                            </div>
                            <div className={styles.subRow}>
                                <span className={styles.sub}>Video</span>
                            </div>
                        </div>
                    </div>
                ) : isImage && getImageUrl() ? (
                    <div className={styles.verticalImageLayout}>
                        {!imageError ? (
                            <img
                                src={getImageUrl()!}
                                alt=""
                                className={styles.fullThumb}
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className={styles.noSnapshotFull}>
                                <span>No Snapshot</span>
                            </div>
                        )}
                        <div className={styles.info}>
                            <div className={styles.titleRow}>
                                <div className={styles.title}>{localItem.metadata?.title || (localItem.type === 'image' ? 'Image Idea' : 'Shared Idea')}</div>
                                <SyncIndicator />
                            </div>
                            <div className={styles.subRow}>
                                {localItem.type === 'link' && (localItem.metadata?.siteName || hostname(localItem.content)) && (
                                    <div className={styles.faviconRow}>
                                        <img
                                            src={localItem.metadata?.favicon || `https://www.google.com/s2/favicons?domain=${hostname(localItem.content)}&sz=64`}
                                            className={styles.miniFavicon}
                                            alt=""
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                        <span className={styles.sub}>
                                            {localItem.metadata?.siteName || hostname(localItem.content)}
                                            {localItem.metadata?.author && ` • ${localItem.metadata.author}`}
                                        </span>
                                    </div>
                                )}
                                {(localItem.type !== 'link' || (!hostname(localItem.content) && !localItem.metadata?.siteName)) && (
                                    <span className={styles.sub}>{localItem.type === 'image' ? 'Image' : 'Idea'}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.simpleLayout}>
                        <div className={styles.iconBox}>
                            {localItem.type === 'text' && <FileText size={18} />}
                            {localItem.type === 'link' && <LinkIcon size={18} />}
                            {localItem.type === 'image' && <ImageIcon size={18} />}
                            {localItem.type === 'video' && <Video size={18} />}
                        </div>
                        <div className={styles.info}>
                            <div className={styles.titleRow}>
                                <div className={styles.title}>{localItem.metadata?.title || localItem.content.slice(0, 50) || 'Idea'}</div>
                                <SyncIndicator />
                            </div>
                            <div className={styles.subRow}>
                                {localItem.type === 'link' && (localItem.metadata?.siteName || hostname(localItem.content)) ? (
                                    <div className={styles.faviconRow}>
                                        <img
                                            src={localItem.metadata?.favicon || `https://www.google.com/s2/favicons?domain=${hostname(localItem.content)}&sz=64`}
                                            className={styles.miniFavicon}
                                            alt=""
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                        <span className={styles.sub}>
                                            {localItem.metadata?.siteName || hostname(localItem.content)}
                                            {localItem.metadata?.author && ` • ${localItem.metadata.author}`}
                                        </span>
                                    </div>
                                ) : (
                                    <span className={styles.sub}>
                                        {localItem.type === 'video' ? 'Video' : 'Idea'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.itemActions}>
                <button className={styles.actionBtn} onClick={handleMove} data-tooltip="Move to Canvas" data-tooltip-pos="left">
                    <ArrowRight size={18} />
                </button>
                <button
                    className={clsx(styles.actionBtn, styles.removeBtn, isDeleting && styles.confirmDelete)}
                    onClick={handleRemove}
                    data-tooltip={isDeleting ? "Confirm Delete" : "Remove"}
                    data-tooltip-pos="left"
                >
                    {isDeleting ? <span className={styles.sureText}>Sure?</span> : <Trash2 size={18} />}
                </button>
            </div>
        </div>
    );
}
