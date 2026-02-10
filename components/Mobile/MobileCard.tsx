"use client";

import React, { useState } from 'react';
import { Item } from '@/types';
import { FileText, Link as LinkIcon, Image as ImageIcon, Copy, Trash2, Archive, Folder, Clock, RefreshCw, CheckCircle2, AlertCircle, Play, Video } from 'lucide-react';
import styles from './MobileCard.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import clsx from 'clsx';

interface MobileCardProps {
    item: Item;
    onClick?: () => void;
}

export default function MobileCard({ item, onClick }: MobileCardProps) {
    const { items, duplicateItem, removeItem, archiveItem, removeFolder, selectedIds, toggleSelection } = useItemsStore();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
    const isSelected = selectedIds.includes(item.id);
    const inSelectionMode = selectedIds.length > 0;

    const isFolder = 'type' in item && (item as any).type === 'folder';
    const folderItems = isFolder ? items.filter(i => i.folder_id === item.id) : [];

    const isVideo = item.type === 'video' || item.metadata?.isVideo;
    const isImage = (item.type === 'image' || (item.type === 'link' && item.metadata?.image)) && !isVideo;
    const imageUrl = item.type === 'image' ? item.content : item.metadata?.image;

    const hostname = (url: string) => {
        if (!url || !url.startsWith('http')) return null;
        try { return new URL(url).hostname; } catch { return null; }
    };

    const getRelativeTime = (dateStr: string) => {
        if (!dateStr) return 'unknown';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const handleDuplicate = (e: React.MouseEvent) => {
        e.stopPropagation();
        duplicateItem(item.id);
    };

    const handleArchive = (e: React.MouseEvent) => {
        e.stopPropagation();
        archiveItem(item.id);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isRemoving) return;

        if (!isDeleting) {
            setIsDeleting(true);
            setTimeout(() => setIsDeleting(false), 3000);
            return;
        }

        setIsRemoving(true);
        setTimeout(() => {
            if (isFolder) {
                console.log('[MobileCard] Removing folder:', item.id);
                removeFolder(item.id);
            } else {
                console.log('[MobileCard] Removing item:', item.id);
                removeItem(item.id);
            }
        }, 500);
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
        if (!item.syncStatus || item.syncStatus === 'synced') return null;

        return (
            <div className={clsx(styles.syncBadge, styles[item.syncStatus])}>
                {item.syncStatus === 'syncing' ? (
                    <RefreshCw size={10} className={styles.spin} />
                ) : (
                    <AlertCircle size={10} />
                )}
                <span>{item.syncStatus === 'syncing' ? 'Syncing...' : 'Error'}</span>
            </div>
        );
    };

    const [imageError, setImageError] = useState(false);

    return (
        <div
            className={clsx(
                styles.card,
                isFolder && styles.gridCard,
                isRemoving && styles.removing,
                isSelected && styles.selected
            )}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
            style={isFolder && (item as any).color ? {
                backgroundColor: `${(item as any).color}15`,
                borderColor: `${(item as any).color}30`
            } : {}}
        >
            <div className={styles.mainContent}>
                {isVideo ? (
                    <div className={styles.imageLayout}>
                        <div className={styles.videoThumbnailWrapper}>
                            <video src={item.content} className={styles.thumb} />
                            <div className={styles.playOverlay}><Play size={24} fill="white" /></div>
                        </div>
                        <div className={styles.info}>
                            <div className={styles.titleRow}>
                                <div className={styles.title}>{item.metadata?.title || 'Video Idea'}</div>
                                <SyncIndicator />
                            </div>
                            <div className={styles.metaRow}>
                                <span className={styles.sub}>Video</span>
                                <span className={styles.dot}>•</span>
                                <span className={styles.time}>{getRelativeTime(item.created_at)}</span>
                            </div>
                        </div>
                    </div>
                ) : isImage && imageUrl ? (
                    <div className={styles.imageLayout}>
                        {!imageError ? (
                            <img
                                src={imageUrl}
                                alt=""
                                className={styles.thumb}
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className={styles.noSnapshotThumb}>
                                <span>No Snapshot</span>
                            </div>
                        )}
                        <div className={styles.info}>
                            <div className={styles.titleRow}>
                                <div className={styles.title}>{item.metadata?.title || (item.type === 'image' ? 'Image Idea' : 'Shared Idea')}</div>
                                <SyncIndicator />
                            </div>
                            <div className={styles.metaRow}>
                                <span className={styles.sub}>{item.type === 'link' ? hostname(item.content) : 'Image'}</span>
                                <span className={styles.dot}>•</span>
                                <span className={styles.time}>{getRelativeTime(item.created_at)}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.simpleLayout}>
                        {!isFolder && (
                            <div
                                className={clsx(styles.iconBox, isFolder && styles.folderIconBox)}
                                style={isFolder && (item as any).color ? {
                                    backgroundColor: `${(item as any).color}25`,
                                    color: (item as any).color
                                } : {}}
                            >
                                {item.type === 'text' && <FileText size={20} />}
                                {item.type === 'link' && !isFolder && (
                                    hostname(item.content) ? (
                                        <img
                                            src={`https://www.google.com/s2/favicons?domain=${hostname(item.content)}&sz=64`}
                                            className={styles.favicon}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <LinkIcon size={20} />
                                    )
                                )}
                                {item.type === 'image' && <ImageIcon size={20} />}
                                {item.type === 'video' && <Video size={20} />}
                            </div>
                        )}
                        <div className={styles.info}>
                            {isFolder && folderItems.length > 0 && (
                                <div className={clsx(
                                    styles.previewGrid,
                                    folderItems.length === 1 && styles.grid1,
                                    folderItems.length === 2 && styles.grid2,
                                    folderItems.length === 3 && styles.grid3,
                                    folderItems.length >= 4 && styles.grid4
                                )}>
                                    {folderItems.slice(0, 4).map(subItem => {
                                        if (subItem.type === 'image' || (subItem.type === 'link' && subItem.metadata?.image)) {
                                            return <img key={subItem.id} src={subItem.type === 'image' ? subItem.content : subItem.metadata?.image} className={styles.miniImage} alt="" />;
                                        }
                                        if (subItem.type === 'video' || subItem.metadata?.isVideo) {
                                            return <div key={subItem.id} className={styles.miniItem}><Video size={12} /></div>;
                                        }
                                        return (
                                            <div key={subItem.id} className={styles.miniItem}>
                                                {subItem.type === 'link' ? <LinkIcon size={12} /> : <FileText size={12} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className={styles.titleRow}>
                                <div className={styles.title}>
                                    {isFolder ? (item as any).name : (item.metadata?.title || item.content.slice(0, 50))}
                                </div>
                                <SyncIndicator />
                            </div>

                            {isFolder ? (
                                <div className={styles.folderMeta}>
                                    <span className={styles.itemCount}>{(item as any).itemCount || folderItems.length} items</span>
                                    <span className={styles.dot}>•</span>
                                    <span className={styles.time}>{getRelativeTime(item.created_at)}</span>
                                </div>
                            ) : (
                                <div className={styles.metaRow}>
                                    <span className={styles.sub}>
                                        {isVideo ? 'Video' : (item.type === 'link' ? (hostname(item.content) || 'Link') : (item.type === 'image' ? 'Image' : 'Idea'))}
                                    </span>
                                    <span className={styles.dot}>•</span>
                                    <span className={styles.time}>{getRelativeTime(item.created_at)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.actions} onClick={e => e.stopPropagation()}>
                <button onClick={handleArchive} className={styles.actionBtn} title="Archive"><Archive size={14} /></button>
                {!isFolder && <button onClick={handleDuplicate} className={styles.actionBtn} title="Duplicate"><Copy size={14} /></button>}
                <button
                    onClick={handleDelete}
                    className={clsx(styles.actionBtn, styles.delete, isDeleting && styles.confirmDelete)}
                    title="Delete"
                >
                    {isDeleting ? "Sure?" : <Trash2 size={14} />}
                </button>
            </div>
        </div >
    );
}
