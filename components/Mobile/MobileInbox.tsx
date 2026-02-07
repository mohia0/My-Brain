"use client";

import React, { useEffect, useState } from 'react';
import { useItemsStore } from '@/lib/store/itemsStore';
import MobileCard from './MobileCard';
import styles from './MobileHome.module.css'; // Reusing Home styles for consistency
import { Inbox as InboxIcon, ArrowDown } from 'lucide-react';

interface MobileInboxProps {
    onItemClick: (id: string) => void;
}

export default function MobileInbox({ onItemClick }: MobileInboxProps) {
    const { items, fetchData } = useItemsStore();
    const [refreshing, setRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const touchStart = React.useRef(0);

    const inboxItems = items.filter(i => i.status === 'inbox')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    useEffect(() => {
        fetchData();
    }, []);

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
            setPullDistance(50);
            await fetchData();
            setTimeout(() => {
                setRefreshing(false);
                setPullDistance(0);
            }, 600);
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
                opacity: pullDistance / 40,
                transform: `translateY(-${Math.max(0, 40 - pullDistance)}px)`
            }}>
                {refreshing ? (
                    <div className={styles.refreshSpinner} />
                ) : (
                    <>
                        <div className={styles.refreshIcon} style={{
                            transform: `rotate(${Math.min(pullDistance * 3, 180)}deg)`
                        }}>
                            <ArrowDown size={20} />
                        </div>
                        <span className={styles.refreshText}>
                            {pullDistance > 55 ? 'Release' : 'Pull'}
                        </span>
                    </>
                )}
            </div>

            {inboxItems.length === 0 ? (
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}><InboxIcon size={48} /></div>
                    <h3>Inbox is clear</h3>
                    <p>When you share links or captures to Brainia, they&apos;ll appear here for organization.</p>
                </div>
            ) : (
                <div className={styles.content}>
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <InboxIcon size={16} />
                            <span>Unsorted Captures</span>
                        </div>
                        <div className={styles.list}>
                            {inboxItems.map(item => (
                                <MobileCard
                                    key={item.id}
                                    item={item}
                                    onClick={() => onItemClick(item.id)}
                                />
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

