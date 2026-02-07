"use client";

import React from 'react';
import { Inbox, LayoutGrid } from 'lucide-react';
import styles from './MobileNav.module.css';
import clsx from 'clsx';
import { useItemsStore } from '@/lib/store/itemsStore';
import MobileAddButton from './MobileAddButton';


interface MobileNavProps {
    activeTab: 'home' | 'inbox' | 'archive';
    onTabChange: (tab: 'home' | 'inbox' | 'archive') => void;
    onAdd: (type: 'text' | 'link' | 'image' | 'folder' | 'camera') => void;
}

export default function MobileNav({ activeTab, onTabChange, onAdd }: MobileNavProps) {
    const { items } = useItemsStore();
    const inboxCount = items.filter(i => i.status === 'inbox').length;

    return (
        <nav className={styles.nav}>
            <button
                className={clsx(styles.navItem, activeTab === 'home' && styles.active)}
                onClick={() => onTabChange('home')}
            >
                <div className={styles.iconWrapper}>
                    <LayoutGrid size={22} />
                </div>
                <span>Ideas</span>
            </button>


            <div className={styles.centerItem}>
                <MobileAddButton onAdd={onAdd} />
            </div>

            <button
                className={clsx(styles.navItem, activeTab === 'inbox' && styles.active)}
                onClick={() => onTabChange('inbox')}
            >
                <div className={styles.iconWrapper}>
                    <Inbox size={22} />
                    {inboxCount > 0 && <span className={styles.badge}>{inboxCount}</span>}
                </div>
                <span>Inbox</span>
            </button>
        </nav>
    );
}

