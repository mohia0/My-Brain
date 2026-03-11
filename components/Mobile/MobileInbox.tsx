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
    const { items, fetchData, realtimeStatus, enrichItem } = useItemsStore();
    const [refreshing, setRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const touchStart = React.useRef(0);
    const [isAutoEnriching, setIsAutoEnriching] = useState(false);
    const hasAutoEnrichedRef = React.useRef(false);

    const inboxItems = items.filter(i => i.status === filterStatus && i.type !== 'project' && i.type !== 'room')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Initial fetch is handled by the root Home component
    // Real-time updates are handled by the items store subscription

    // Auto-enrich stuck items when inbox is viewed
    useEffect(() => {
        if (!hasAutoEnrichedRef.current && inboxItems.length > 0) {
            const stuckItems = inboxItems.filter(i => i.type === 'link' && !i.metadata?.title);
            if (stuckItems.length > 0) {
                console.log(`[MobileInbox] Found ${stuckItems.length} stuck items. Auto-enriching...`);
                setIsAutoEnriching(true);
                hasAutoEnrichedRef.current = true;
                
                // Enroll one by one with a small gap to avoid rate limiting
                stuckItems.forEach((item, index) => {
                    setTimeout(() => {
                        enrichItem(item.id);
                        if (index === stuckItems.length - 1) {
                            setTimeout(() => setIsAutoEnriching(false), 2000);
                        }
                    }, index * 1000);
                });
            }
        }
    }, [inboxItems, enrichItem]);

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
                    <h3>{filterStatus === 'archived' ? 'Archive is empty' : 'Your mind is clear'}</h3>
                    <p>{filterStatus === 'archived' ? 'Items you archive will appear here.' : 'Ready for your next epiphany? Share links or ideas and they\'ll wait here for you.'}</p>
                    {filterStatus === 'inbox' && (
                        <div className={styles.tinyMessage}>
                            This is your captures page! Ideas you capture will wait here safely. Be creative!
                        </div>
                    )}
                </div>
            ) : (
                <div className={styles.content}>
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <InboxIcon size={16} />
                            <span style={{ marginLeft: 6 }}>{filterStatus === 'archived' ? 'Archived Ideas' : 'Captured Ideas'}</span>
                            {isAutoEnriching && !refreshing && (
                                <div style={{ 
                                    marginLeft: 12, 
                                    fontSize: '0.7rem', 
                                    color: 'var(--accent)', 
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}>
                                    <div className={styles.refreshSpinner} style={{ width: 12, height: 12, borderWidth: 2 }} />
                                    <span>Updating metadata...</span>
                                </div>
                            )}
                            <div style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: realtimeStatus === 'connected' ? '#4caf50' : (realtimeStatus === 'connecting' ? '#ff9800' : '#f44336'),
                                marginLeft: 'auto',
                                boxShadow: realtimeStatus === 'connected' ? '0 0 8px rgba(76, 175, 80, 0.4)' : 'none',
                                flexShrink: 0
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

