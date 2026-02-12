"use client";

import React, { useState } from 'react';
import styles from './Header.module.css';
import { Search, Folder as FolderIcon } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useCanvasStore } from '@/lib/store/canvasStore';
import Orb from '../Orb/Orb';
import clsx from 'clsx';

export default function Header() {
    const { items, folders, setSelection } = useItemsStore();
    const { setPosition, setScale, setOpenFolderId } = useCanvasStore();
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    React.useEffect(() => {
        const savedTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' || 'dark';
        setTheme(savedTheme);

        // Optional: observe attribute changes
        const observer = new MutationObserver(() => {
            const currentTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' || 'dark';
            setTheme(currentTheme);
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    const filteredFolders = folders.filter(folder => {
        if (!query) return false;
        const q = query.toLowerCase();
        return folder.name.toLowerCase().includes(q);
    });

    const filteredItems = items.filter(item => {
        if (!query) return false;
        const q = query.toLowerCase();

        const title = (item.metadata?.title || '').toString().toLowerCase();
        const content = (item.content || '').toString().toLowerCase();
        const description = (item.metadata?.description || '').toString().toLowerCase();

        // Items might have tags in metadata (from shared/extensions) 
        // OR we might have them fetched. For now search metadata.
        const tags = Array.isArray(item.metadata?.tags)
            ? item.metadata.tags.map((t: any) => (typeof t === 'string' ? t : t.name).toLowerCase())
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
        // setScale(targetScale); // WIll do conditionally later

        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        let targetX = result.position_x;
        let targetY = result.position_y;
        let isInsideFolder = false;

        // Correct position if inside a folder
        if (result.resultType === 'item' && result.folder_id) {
            const folder = folders.find(f => f.id === result.folder_id);
            if (folder) {
                targetX = folder.position_x;
                targetY = folder.position_y;
                isInsideFolder = true;
                setOpenFolderId(folder.id);
            }
        }

        // Width/Height offsets to center the card (or folder)
        let itemW = 200;
        let itemH = 130;

        if (result.resultType === 'folder' || isInsideFolder) {
            itemW = 280; // Folder width
            itemH = 120; // Folder height
        } else if (result.type === 'link' && result.metadata?.image) {
            itemW = 300;
            itemH = 100;
        } else if (result.type === 'link') {
            itemW = 200;
            itemH = 40;
        }

        if (!isInsideFolder) {
            const newX = (viewportW / 2) - (targetX + itemW / 2) * targetScale;
            const newY = (viewportH / 2) - (targetY + itemH / 2) * targetScale;
            setPosition(newX, newY);
            // Only zoom if on canvas
            setScale(targetScale);
        } else {
            // Just open selector. Folder highlights automatically via openFolderId
        }

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
                    <Orb
                        hue={280}
                        hoverIntensity={0.8}
                        forceHoverState={true}
                        backgroundColor="transparent"
                    />
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
                            allResults.map((result: any) => {
                                const projectAreas = items.filter(i => i.type === 'project');
                                let insideProject = null;

                                if (result.resultType === 'item' && result.type !== 'project') {
                                    // Calculate center of item
                                    const iW = result.metadata?.width || 200;
                                    const iH = result.metadata?.height || 130;
                                    const cx = result.position_x + iW / 2;
                                    const cy = result.position_y + iH / 2;

                                    insideProject = projectAreas.find(p => {
                                        const pW = p.metadata?.width || 300;
                                        const pH = p.metadata?.height || 200;
                                        return cx > p.position_x && cx < p.position_x + pW &&
                                            cy > p.position_y && cy < p.position_y + pH;
                                    });
                                }

                                return (
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
                                            <div className={styles.resultBadges}>
                                                <span className={clsx(styles.typeBadge, result.resultType === 'folder' ? styles.badgeFolder : styles.badgeItem)}>
                                                    {result.resultType === 'folder' ? 'Folder' : (result.type === 'link' ? 'Link' : result.type === 'image' ? 'Image' : 'Idea')}
                                                </span>
                                                {insideProject && (
                                                    <span className={clsx(styles.typeBadge, styles.badgeProject)}>
                                                        in {insideProject.metadata?.title || 'Project'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={styles.resultDescription}>
                                                {result.resultType !== 'folder' && (result.metadata?.description || (result.type === 'image' ? '' : result.content?.substring(0, 60)))}
                                                {result.resultType === 'item' && result.type !== 'image' && result.content?.length > 60 && '...'}
                                            </div>
                                            {result.resultType === 'item' && result.metadata?.tags && Array.isArray(result.metadata.tags) && result.metadata.tags.length > 0 && (
                                                <div className={styles.resultTags}>
                                                    {result.metadata.tags.map((tag: any, i: number) => {
                                                        const tagName = typeof tag === 'string' ? tag : tag.name;
                                                        return <span key={i} className={styles.resultTag}>#{tagName}</span>;
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
