import React from 'react';
import { Item } from '@/types';
import { FileText, Link as LinkIcon, Image as ImageIcon, ArrowRight, Trash2 } from 'lucide-react';
import styles from './MobileInbox.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';

interface MobileInboxItemProps {
    item: Item;
    onClick?: () => void;
}

export default function MobileInboxItem({ item, onClick }: MobileInboxItemProps) {
    const { updateItemContent, removeItem } = useItemsStore();
    const isImage = (item.type === 'link' && item.metadata?.image) || item.type === 'image';

    const getImageUrl = () => {
        if (item.type === 'image') return item.content;
        return item.metadata?.image;
    };

    const hostname = (url: string) => {
        try { return new URL(url).hostname; } catch { return 'Idea'; }
    };

    const handleMove = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateItemContent(item.id, { status: 'active' });
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        removeItem(item.id);
    };

    return (
        <div className={styles.itemCard} onClick={onClick}>
            <div className={styles.itemMain}>
                {isImage && getImageUrl() ? (
                    <div className={styles.imageLayout}>
                        <img src={getImageUrl()!} alt="" className={styles.thumb} />
                        <div className={styles.info}>
                            <div className={styles.title}>{item.metadata?.title || (item.type === 'image' ? 'Image Idea' : 'Shared Idea')}</div>
                            <div className={styles.sub}>{item.type === 'link' ? hostname(item.content) : 'Image'}</div>
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
                            <div className={styles.sub}>
                                {item.type === 'link' ? hostname(item.content) : 'Idea'}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.itemActions}>
                <button className={styles.actionBtn} onClick={handleMove} title="Move to Brainia">
                    <ArrowRight size={18} />
                </button>
                <button className={`${styles.actionBtn} ${styles.removeBtn}`} onClick={handleRemove} title="Remove">
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}
