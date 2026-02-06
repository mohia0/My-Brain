"use client";

import React, { useState } from 'react';
import styles from './Header.module.css';
import { Search, Folder as FolderIcon } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import Orb from '../Orb/Orb';

export default function Header() {
    const { items, folders, setSelection } = useItemsStore();
    const { setPosition, setScale } = useCanvasStore();
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);

    const filteredFolders = folders.filter(folder => {
        if (!query) return false;
        const q = query.toLowerCase();
        return folder.name.toLowerCase().includes(q);
    });

    const filteredItems = items.filter(item => {
        if (!query) return false;
        const q = query.toLowerCase();

        // Robust checking for optional properties
        const title = (item.metadata?.title || '').toString().toLowerCase();
        const content = (item.content || '').toString().toLowerCase();
        const description = (item.metadata?.description || '').toString().toLowerCase();

        // Ensure tags is actually an array before mapping
        const tags = Array.isArray(item.metadata?.tags)
            ? item.metadata.tags.map((t: any) => (t || '').toString().toLowerCase())
            : [];

        return title.includes(q) ||
            content.includes(q) ||
            description.includes(q) ||
            tags.some((t: string) => t.includes(q));
    });

    const allResults = [
        ...filteredFolders.map(f => ({ ...f, resultType: 'folder' })),
        ...filteredItems.map(i => ({ ...i, resultType: 'item' }))
    ];

    const handleResultClick = (result: any) => {
        // Center on item at target zoom level
        const targetScale = 1.105;
        setScale(targetScale);

        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        // Width/Height offsets to center the card, not the top-left corner
        let itemW = 200;
        let itemH = 130;

        if (result.resultType === 'folder') {
            itemW = 200;
            itemH = 148;
        } else if (result.type === 'link' && result.metadata?.image) {
            itemW = 300; // Capture Card width
            itemH = 100; // Capture Card height
        } else if (result.type === 'link') {
            itemW = 200;
            itemH = 40; // Link Card height
        }

        const newX = (viewportW / 2) - (result.position_x + itemW / 2) * targetScale;
        const newY = (viewportH / 2) - (result.position_y + itemH / 2) * targetScale;

        setPosition(newX, newY);

        // Focus mode: Select the item/folder
        setSelection([result.id]);

        setShowResults(false);
        setQuery('');
    };

    return (
        <header className={styles.header}>
            <div className={styles.logo} onClick={() => {
                setPosition(window.innerWidth / 2, window.innerHeight / 2);
                setScale(0.65);
            }}>
                <div className={styles.logoDotWrapper}>
                    <Orb hue={280} hoverIntensity={0.8} forceHoverState={true} backgroundColor="transparent" />
                </div>
                <h1>Brainia</h1>
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
                        {allResults.length === 0 ? (
                            <div className={styles.noResults}>No matches found. Try searching for tags or text.</div>
                        ) : (
                            allResults.map((result: any) => (
                                <div key={result.id} className={styles.searchResultItem} onClick={() => handleResultClick(result)}>
                                    {result.resultType === 'folder' ? (
                                        <div className={styles.resultIcon}>
                                            <FolderIcon
                                                size={16}
                                                fill={result.color ? `${result.color}22` : undefined}
                                                color={result.color || "var(--accent)"}
                                            />
                                        </div>
                                    ) : (
                                        (result.type === 'image' || (result.type === 'link' && result.metadata?.image)) ? (
                                            <img
                                                src={result.type === 'image' ? result.content : result.metadata?.image}
                                                alt=""
                                                className={styles.resultImg}
                                            />
                                        ) : (
                                            <div className={styles.resultIcon}>
                                                {result.type === 'link' ? '🔗' : '📄'}
                                            </div>
                                        )
                                    )}
                                    <div className={styles.resultText}>
                                        <div className={styles.resultTitleRow}>
                                            <div className={styles.resultTitle}>
                                                {result.resultType === 'folder' ? result.name : (result.metadata?.title || 'Untitled')}
                                            </div>
                                            <div className={styles.resultDate}>
                                                {new Date(result.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                        <div className={styles.resultDescription}>
                                            {result.resultType === 'folder'
                                                ? 'Folder'
                                                : (result.metadata?.description || (result.type === 'image' ? 'Image File' : result.content?.substring(0, 60)))}
                                            {result.resultType === 'item' && result.type !== 'image' && result.content?.length > 60 && '...'}
                                        </div>
                                        {result.resultType === 'item' && result.metadata?.tags && Array.isArray(result.metadata.tags) && result.metadata.tags.length > 0 && (
                                            <div className={styles.resultTags}>
                                                {result.metadata.tags.map((tag: string, i: number) => (
                                                    <span key={i} className={styles.resultTag}>#{tag}</span>
                                                ))}
                                            </div>
                                        )}
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
