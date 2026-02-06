"use client";

import React from 'react';
import { Home, Inbox, LayoutGrid } from 'lucide-react';
import styles from './MobileNav.module.css';
import clsx from 'clsx';
import { useItemsStore } from '@/lib/store/itemsStore';

interface MobileNavProps {
    activeTab: 'home' | 'inbox';
    onTabChange: (tab: 'home' | 'inbox') => void;
}

export default function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
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
                <span>Canvas</span>
            </button>
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
