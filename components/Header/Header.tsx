"use client";

import React, { useState } from 'react';
import styles from './Header.module.css';
import { Search } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';

export default function Header() {
    const { items, setSelection } = useItemsStore();
    const { setPosition, setScale } = useCanvasStore();
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);

    const filteredItems = items.filter(item => {
        if (!query) return false;
        const text = (item.content + (item.metadata?.title || '')).toLowerCase();
        return text.includes(query.toLowerCase());
    });

    const handleResultClick = (item: any) => {
        // Center on item at 170% zoom (0.65 * 1.7 = 1.105)
        const targetScale = 1.105;
        setScale(targetScale);

        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        const newX = (viewportW / 2) - (item.position_x * targetScale);
        const newY = (viewportH / 2) - (item.position_y * targetScale);

        setPosition(newX, newY);

        // Focus mode: Select the item
        setSelection([item.id]);

        setShowResults(false);
        setQuery('');
    };

    return (
        <header className={styles.header}>
            <div className={styles.logo} onClick={() => {
                setPosition(window.innerWidth / 2, window.innerHeight / 2);
                setScale(0.65);
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
