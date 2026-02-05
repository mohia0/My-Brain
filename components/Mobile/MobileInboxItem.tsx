import React from 'react';
import { Item } from '@/types';
import { FileText, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import styles from './MobileInbox.module.css';

interface MobileInboxItemProps {
    item: Item;
    onClick?: () => void;
}

export default function MobileInboxItem({ item, onClick }: MobileInboxItemProps) {
    const isImage = item.type === 'link' && item.metadata?.image;

    const hostname = (url: string) => {
        try { return new URL(url).hostname; } catch { return url; }
    };

    return (
        <div className={styles.itemCard} onClick={onClick}>
            {isImage ? (
                <div className={styles.imageLayout}>
                    <img src={item.metadata!.image!} alt="" className={styles.thumb} />
                    <div className={styles.info}>
                        <div className={styles.title}>{item.metadata?.title || 'Unknown Image'}</div>
                        <div className={styles.sub}>{hostname(item.content)}</div>
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
                        <div className={styles.title}>{item.metadata?.title || item.content.slice(0, 50)}</div>
                        <div className={styles.sub}>
                            {item.type === 'link' ? hostname(item.content) : 'Note'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
