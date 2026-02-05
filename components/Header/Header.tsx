"use client";

import React, { useState } from 'react';
import styles from './Header.module.css';
import { Search } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';

export default function Header() {
    const { items } = useItemsStore();
    const { setPosition, setScale } = useCanvasStore();
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);

    const filteredItems = items.filter(item => {
        if (!query) return false;
        const text = (item.content + (item.metadata?.title || '')).toLowerCase();
        return text.includes(query.toLowerCase());
    });

    const handleResultClick = (item: any) => {
        // Fly to item logic
        // We want the item to be centered.
        // screenCenter = (position + itemPos * scale)
        // We need to setPosition such that itemPos ends up in center
        // NewPosition = (ViewportCenter / Scale) - ItemPosition ?? 
        // Actually simpler:
        // Canvas transform is translate(x, y) scale(s)
        // To center item at (ix, iy):
        // x = (WindowWidth / 2) - (ix * s)
        // y = (WindowHeight / 2) - (iy * s)
        // For now let's just approximate center

        // reset scale for simplicity or keep it? Let's keep it but maybe zoom in a bit if too far out
        const targetScale = 1;
        setScale(targetScale);

        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        const newX = (viewportW / 2) - (item.position_x * targetScale);
        const newY = (viewportH / 2) - (item.position_y * targetScale);

        setPosition(newX, newY);

        setShowResults(false);
        setQuery('');
    };

    return (
        <header className={styles.header}>
            <div className={styles.logo} onClick={() => {
                setPosition(window.innerWidth / 2, window.innerHeight / 2);
                setScale(1);
            }}>
                <div className={styles.logoDot} />
                <h1>My Brain</h1>
            </div>

            <div className={styles.searchWrapper}>
                <Search size={16} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="Search..."
                    className={styles.searchInput}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                />
                {showResults && query && (
                    <div className={styles.searchResults}>
                        {filteredItems.length === 0 ? (
                            <div className={styles.noResults}>No results found</div>
                        ) : (
                            filteredItems.map(item => (
                                <div key={item.id} className={styles.searchResultItem} onClick={() => handleResultClick(item)}>
                                    {item.type === 'link' && item.metadata?.image && (
                                        <img src={item.metadata.image} alt="" className={styles.resultImg} />
                                    )}
                                    <div className={styles.resultText}>
                                        <div className={styles.resultTitle}>{item.metadata?.title || 'Untitled'}</div>
                                        <div className={styles.resultContent}>{item.content.substring(0, 30)}...</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
