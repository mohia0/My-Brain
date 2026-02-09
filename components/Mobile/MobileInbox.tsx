"use client";

import React, { useEffect, useState } from 'react';
import { useItemsStore } from '@/lib/store/itemsStore';
import MobileInboxItem from './MobileInboxItem';
import styles from './MobileHome.module.css'; // Reusing Home styles for consistency
import { Inbox as InboxIcon, ArrowDown } from 'lucide-react';

interface MobileInboxProps {
    onItemClick: (id: string) => void;
    filterStatus?: 'inbox' | 'archived';
}

export default function MobileInbox({ onItemClick, filterStatus = 'inbox' }: MobileInboxProps) {
    const { items, fetchData, realtimeStatus } = useItemsStore();
    const [refreshing, setRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const touchStart = React.useRef(0);

    const inboxItems = items.filter(i => i.status === filterStatus)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Initial fetch is handled by the root Home component
    // Real-time updates are handled by the items store subscription

    const handleTouchStart = (e: React.TouchEvent) => {
        if (containerRef.current?.scrollTop === 0) {
            touchStart.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStart.current > 0) {
            const currentTouch = e.touches[0].clientY;
            const distance = currentTouch - touchStart.current;
            if (distance > 0) {
                // Resistance effect
                const pull = Math.min(distance * 0.4, 80);
                setPullDistance(pull);
            }
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance > 55 && !refreshing) {
            setRefreshing(true);
            setPullDistance(60); // Hold it open
            await fetchData();
            setTimeout(() => {
                setRefreshing(false);
                setPullDistance(0);
            }, 800);
        } else {
            setPullDistance(0);
        }
        touchStart.current = 0;
    };

    return (
        <div
            ref={containerRef}
            className={styles.container}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                transform: `translateY(${pullDistance}px)`,
                transition: pullDistance === 0 ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
            }}
        >
            <div className={styles.pullIndicator} style={{
                height: 60,
                opacity: pullDistance > 10 ? 1 : 0,
            }}>
                {refreshing ? (
                    <div className={styles.refreshSpinner} />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div className={styles.refreshIcon} style={{
                            transform: `rotate(${Math.min(pullDistance * 3, 180)}deg) scale(${Math.min(0.5 + pullDistance / 100, 1)})`
                        }}>
                            <ArrowDown size={24} />
                        </div>
                        <span className={styles.refreshText}>
                            {pullDistance > 55 ? 'Release' : 'Pull to refresh'}
                        </span>
                    </div>
                )}
            </div>

            {inboxItems.length === 0 ? (
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}><InboxIcon size={48} /></div>
                    <h3>{filterStatus === 'archived' ? 'Archive is empty' : 'Inbox is clear'}</h3>
                    <p>{filterStatus === 'archived' ? 'Items you archive will appear here.' : 'When you share links or ideas to Brainia, they\'ll appear here for organization.'}</p>
                </div>
            ) : (
                <div className={styles.content}>
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <InboxIcon size={16} />
                            <span>{filterStatus === 'archived' ? 'Archived Ideas' : 'Captured Ideas'}</span>
                            <div style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: realtimeStatus === 'connected' ? '#4caf50' : (realtimeStatus === 'connecting' ? '#ff9800' : '#f44336'),
                                marginLeft: 6,
                                boxShadow: realtimeStatus === 'connected' ? '0 0 8px rgba(76, 175, 80, 0.4)' : 'none'
                            }} />
                        </div>
                        <div className={styles.list}>
                            {inboxItems.map((item, index) => (
                                <div key={item.id} style={{ animationDelay: `${index * 0.05}s` }}>
                                    <MobileInboxItem
                                        item={item}
                                        onClick={() => onItemClick(item.id)}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

