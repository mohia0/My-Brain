"use client";

import React from 'react';
import styles from './ItemCard.module.css';
import { Item } from '@/types';
import { FileText, Link, Image as ImageIcon } from 'lucide-react';

interface ItemCardProps {
    item: Item;
}

export default function ItemCard({ item }: ItemCardProps) {
    const getIcon = () => {
        switch (item.type) {
            case 'link': return <Link size={16} />;
            case 'image': return <ImageIcon size={16} />;
            default: return <FileText size={16} />;
        }
    };

    return (
        <div
            className={styles.card}
            style={{
                left: item.position_x,
                top: item.position_y,
            }}
        >
            <div className={styles.header}>
                {getIcon()}
                <span className={styles.title}>{item.metadata?.title || 'Untitled'}</span>
            </div>
            <div className={styles.content}>
                {item.type === 'image' ? (
                    <img src={item.content} alt="content" className={styles.imageContent} />
                ) : (
                    <p>{item.content}</p>
                )}
            </div>
        </div>
    );
}
