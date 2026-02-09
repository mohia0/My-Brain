"use client";

import React, { useEffect, useState } from 'react';
import MobileHeader from './MobileHeader';
import MobileNav from './MobileNav';
import MobileHome from './MobileHome';
import MobileInbox from './MobileInbox';
import MobileArchive from './MobileArchive';
import MobileAddButton from './MobileAddButton';
import ShareProcessingOverlay from './ShareProcessingOverlay';
import Orb from '../Orb/Orb';
import ItemModal from '@/components/ItemModal/ItemModal';
import FolderModal from '@/components/FolderModal/FolderModal';
import InputModal from '@/components/InputModal/InputModal';
import MobileSelectionBar from './MobileSelectionBar';
import { useItemsStore } from '@/lib/store/itemsStore';
import { supabase } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';
import { generateId } from '@/lib/utils';



// We access SendIntent dynamically to avoid Capacitor 2 build errors

export default function MobilePageContent({ session }: { session: any }) {
    const [activeTab, setActiveTab] = useState<'home' | 'inbox' | 'archive'>('home');
    const [shareState, setShareState] = useState<'idle' | 'saving' | 'saved' | 'capturing'>('idle');
    const [isOverlayFading, setIsOverlayFading] = useState(false);

    // Dynamic API Base URL handling for Capacitor
    // When running as a native app, we need to point to the production API
    // Default to Vercel production URL if env var is not set
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://brainia.vercel.app';

    const getApiUrl = (endpoint: string) => {
        const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

        if (Capacitor.isNativePlatform()) {
            // ON NATIVE: Always use the full explicit URL from environment
            return `${cleanBase}${cleanEndpoint}`;
        }

        if (typeof window !== 'undefined') {
            const h = window.location.hostname;
            const isLocal = h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') || h.startsWith('10.') || h.startsWith('172.');

            // If we're on a local network (dev), use the current host as base
            if (isLocal) {
                return `${window.location.origin}${cleanEndpoint}`;
            }
        }

        return cleanEndpoint;
    };

    // Modal states
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [inputModalConfig, setInputModalConfig] = useState<{
        isOpen: boolean;
        type: 'text' | 'link' | 'image' | 'camera' | 'folder' | null;
        placeholder: string;
        title: string;
        mode: 'text' | 'file' | 'camera';
    }>({ isOpen: false, type: null, placeholder: '', title: '', mode: 'text' });

    // State Refs for Back Button (to avoid stale closures)
    const selectedItemIdRef = React.useRef<string | null>(null);
    const selectedFolderIdRef = React.useRef<string | null>(null);
    const inputModalOpenRef = React.useRef<boolean>(false);
    const selectionCountRef = React.useRef<number>(0);

    const { items, folders, selectedIds, addItem, addFolder, clearSelection, updateItemContent } = useItemsStore();

    useEffect(() => { selectedItemIdRef.current = selectedItemId; }, [selectedItemId]);
    useEffect(() => { selectedFolderIdRef.current = selectedFolderId; }, [selectedFolderId]);
    useEffect(() => { inputModalOpenRef.current = inputModalConfig.isOpen; }, [inputModalConfig.isOpen]);
    useEffect(() => { selectionCountRef.current = selectedIds.length; }, [selectedIds.length]);

    useEffect(() => {
        const initCapacitor = async () => {
            if (!Capacitor.isNativePlatform()) return;

            try {
                const { registerPlugin } = await import('@capacitor/core');

                // 1. Handle Sharing Intents
                console.log("[MobileInit] Initializing SendIntent. User:", session?.user?.id);
                const SendIntent = registerPlugin<any>('SendIntent');

                if (SendIntent) {
                    SendIntent.addListener('appSendActionIntent', (data: any) => {
                        console.log("[MobileShare] Listener triggered", !!data);
                        handleSharedContent(data);
                    });

                    if (typeof SendIntent.checkSendIntentReceived === 'function') {
                        try {
                            const result = await SendIntent.checkSendIntentReceived();
                            if (result && (result.value || result.extras || result.files)) {
                                handleSharedContent(result);
                            }
                        } catch (e) {
                            console.warn("[MobileShare] checkSendIntentReceived failed", e);
                        }
                    }
                }

                // 2. Handle System Back Button (Android)
                // Use the official @capacitor/app plugin name
                const AppPlugin = registerPlugin<any>('App');
                if (AppPlugin) {
                    console.log("[MobileInit] Setting up App (Back Button) listener");

                    // We need to handle this with a delay to ensure it doesn't conflict with initial load
                    setTimeout(async () => {
                        try {
                            // Don't remove all listeners as it might break web-view internal navigation
                            AppPlugin.addListener('backButton', (data: { canGoBack: boolean }) => {
                                const backEvent = new CustomEvent('systemBack', { cancelable: true });
                                window.dispatchEvent(backEvent);

                                if (backEvent.defaultPrevented) return;

                                if (inputModalOpenRef.current) {
                                    setInputModalConfig(prev => ({ ...prev, isOpen: false }));
                                } else if (selectedFolderIdRef.current) {
                                    setSelectedFolderId(null);
                                } else if (selectedItemIdRef.current) {
                                    setSelectedItemId(null);
                                } else if (selectionCountRef.current > 0) {
                                    clearSelection();
                                } else if (data.canGoBack) {
                                    window.history.back();
                                } else {
                                    AppPlugin.exitApp();
                                }
                            });
                        } catch (e) {
                            console.error("[MobileInit] App listener failed:", e);
                        }
                    }, 500);
                }
            } catch (err) {
                console.error("Capacitor registration error:", err);
            }
        };

        initCapacitor();
        return () => {
            const cap = (window as any).Capacitor;
            if (cap?.Plugins?.App?.removeAllListeners) cap.Plugins.App.removeAllListeners();
        };
    }, []);


    const uploadMobileFile = async (uri: string, itemId: string, userId: string): Promise<string | null> => {
        console.log(`[MobileUpload] Starting for URI: ${uri}`);
        try {
            // Ensure we have a usable URI
            const pocketUri = (uri.startsWith('data:') || uri.startsWith('http')) ? uri : Capacitor.convertFileSrc(uri);
            console.log(`[MobileUpload] Converted URI: ${pocketUri.substring(0, 50)}...`);

            if (!pocketUri || pocketUri === "") {
                throw new Error("Converted URI is empty");
            }

            // Retry mechanism for fetch
            let response: Response | null = null;
            let fetchError: any = null;

            for (let i = 0; i < 3; i++) {
                try {
                    response = await fetch(pocketUri);
                    if (response.ok) break;
                } catch (e) {
                    fetchError = e;
                    console.warn(`[MobileUpload] Attempt ${i + 1} failed:`, e);
                    await new Promise(r => setTimeout(r, 500));
                }
            }

            if (!response || !response.ok) {
                console.error(`[MobileUpload] Fetch failed after retries: ${response?.statusText || fetchError}`);
                throw new Error(`Fetch failed: ${response?.statusText || fetchError}`);
            }

            const blob = await response.blob();
            console.log(`[MobileUpload] Blob info: size=${blob.size}, type=${blob.type}`);

            if (blob.size < 10) {
                console.warn("[MobileUpload] Blob is suspiciously small, might be empty");
            }

            // Ensure valid mime type
            const mimeType = blob.type || 'image/jpeg';
            const extension = mimeType.split('/')[1] || 'jpg';
            const filename = `${userId}/${itemId}_capture.${extension}`;

            console.log(`[MobileUpload] Attempting Supabase upload to: ${filename}`);
            const { error } = await supabase.storage
                .from('screenshots')
                .upload(filename, blob, {
                    contentType: mimeType,
                    upsert: true
                });

            if (error) {
                console.error("[MobileUpload] Supabase Error Details:", JSON.stringify(error, null, 2));
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('screenshots')
                .getPublicUrl(filename);

            if (!publicUrl) throw new Error("Generated public URL is empty");

            console.log(`[MobileUpload] Verify Public URL: ${publicUrl}`);
            return publicUrl;
        } catch (err) {
            console.error("[MobileUpload] Critical failure in uploadMobileFile:", err);
            return null;
        }
    };

    const handleSharedContent = async (data: any) => {
        if (!data) return;

        console.log("[MobileShare] Processing Share Intent:", JSON.stringify(data, null, 1));

        // 1. Initial UI Feedback
        setActiveTab('inbox');
        setShareState('capturing');
        setIsOverlayFading(false);

        try {
            const userId = session?.user?.id || 'unknown';
            const extras = data.extras || {};

            // --- DATA EXTRACTION ---
            // Extract raw text from any possible intent field
            let rawText = (
                extras['android.intent.extra.TEXT'] ||
                extras['android.intent.extra.PROCESS_TEXT'] ||
                data.value || data.text || data.url || ""
            ).toString().trim();

            // Extract title/subject
            const intentTitle = (data.title || data.subject || extras['android.intent.extra.SUBJECT'] || "").toString().trim();

            // Exhaustive URL Detection: Check text, then data.url, then subject
            const urlRegex = /(?:https?:\/\/|www\.)[^\s\r\n\(\)\[\]\{\}\>\<\"\'\^]+(?:\.[^\s\r\n\(\)\[\]\{\}\>\<\"\'\^]+)*/gi;

            const allMatches = [
                ...(rawText.match(urlRegex) || []),
                ...(intentTitle.match(urlRegex) || []),
                ...(data.url ? [data.url] : [])
            ];

            // Choose the longest URL found (prevents truncated urls from appearing in one field but not another)
            let urlToProcess = allMatches.sort((a, b) => b.length - a.length)[0] || null;

            let finalUrl = urlToProcess;
            if (finalUrl) {
                finalUrl = finalUrl.trim();
                // Remove trailing dots, commas, or punctuation that might have been caught
                finalUrl = finalUrl.replace(/[\.\,\?\#\!\;\:]+$/, "");
                if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
            }

            // Extract Description (Text minus URL)
            let description = rawText;
            if (finalUrl && urlToProcess) {
                // Remove the EXACT url string matched
                const escapedUrl = urlToProcess.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                description = rawText.replace(new RegExp(escapedUrl, 'gi'), "").trim();

                // Extra safety: if the remaining text contains bits of the url like ".com/share", try a more aggressive clean
                if (finalUrl.includes('facebook') || finalUrl.includes('instagram')) {
                    description = description.replace(/\.com\/[^\s]*/gi, "").trim();
                }

                // Final descriptive cleaning
                description = description.replace(/^[:\-–—\s\u2013\u2014]+|[:\-–—\s\u2013\u2014]+$/g, "");
            }

            // Files handling
            let processedFiles = data.files || [];
            const streamUri = extras['android.intent.extra.STREAM'];
            const dataUri = data.uri || data.path;

            if (processedFiles.length === 0 && (streamUri || dataUri)) {
                const finalUris = Array.isArray(streamUri) ? streamUri : [streamUri || dataUri];
                for (const uri of finalUris) {
                    if (!uri) continue;
                    const uriStr = uri.toString();
                    const mime = data.mimeType || data.type || "";
                    const potentiallyImage = mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(uriStr) || uriStr.startsWith('content://');
                    if (potentiallyImage || mime.startsWith('video/') || mime === 'application/pdf' || mime === '*/*') {
                        processedFiles.push({
                            uri: uriStr,
                            mimeType: mime || (potentiallyImage ? 'image/jpeg' : 'application/octet-stream'),
                            name: data.name || "Shared Media"
                        });
                    }
                }
            }

            // --- PROCESSING STRATEGY ---
            setShareState('saving');
            const itemId = generateId();
            let itemType: 'text' | 'link' | 'image' | 'video' = 'text';
            let itemContent = rawText;

            // Initial Title Logic: Ignore garbage like "Shared Link" from Android
            let initialTitle = intentTitle;
            if (!initialTitle || /shared link|sharedlink/i.test(initialTitle)) {
                initialTitle = finalUrl ? "Capturing..." : "Idea Note";
            }

            let metadata: any = {
                title: initialTitle,
                description: description || rawText,
                source: 'mobile-share'
            };

            if (finalUrl) {
                itemType = 'link';
                itemContent = finalUrl;
            }

            // If we have files, handle the first one as primary
            if (processedFiles.length > 0) {
                const file = processedFiles[0];
                const isImage = file.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.uri);
                const isVideo = file.mimeType?.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(file.uri);

                if (isImage || isVideo) {
                    const uploaded = await uploadMobileFile(file.uri, itemId, userId);
                    if (uploaded) {
                        if (finalUrl) {
                            // Link with a shared image (common for social)
                            metadata.image = uploaded;
                            metadata.isVideo = isVideo;
                        } else {
                            // Standalone media
                            itemType = isVideo ? 'video' : 'image';
                            itemContent = uploaded;
                            metadata.isVideo = isVideo;
                        }
                    }
                }
            }

            // 1. CREATE INITIAL ITEM
            await addItem({
                id: itemId,
                user_id: userId,
                type: itemType,
                content: itemContent,
                status: 'inbox',
                metadata: metadata,
                position_x: 0, position_y: 0,
                created_at: new Date().toISOString()
            });

            // 2. ENRICH IN BACKGROUND (IF LINK)
            if (finalUrl) {
                const metaUrl = getApiUrl('/api/metadata');
                const shotUrl = getApiUrl('/api/screenshot');

                // Fire and forget metadata
                fetch(metaUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: finalUrl, itemId, userId })
                })
                    .then(r => r.json())
                    .then(newMeta => {
                        if (!newMeta.error) {
                            const existing = useItemsStore.getState().items.find(i => i.id === itemId);
                            updateItemContent(itemId, {
                                metadata: { ...existing?.metadata, ...newMeta, source: 'mobile-enriched' }
                            });
                        }
                    })
                    .catch(e => console.error("[MobileShare] Metadata error:", e));

                // Trigger screenshot
                setTimeout(() => {
                    fetch(shotUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: finalUrl, itemId, userId })
                    }).catch(e => console.error("[MobileShare] Screenshot error:", e));
                }, 1000);
            }

            // SUCCESS FLOW
            setShareState('saved');
            setTimeout(() => {
                setIsOverlayFading(true);
                // Removed fetchData() as it can cause race conditions overwriting enriched data
                setTimeout(() => {
                    setShareState('idle');
                    setIsOverlayFading(false);
                }, 500);
            }, 1000);

        } catch (error: any) {
            console.error("[MobileShare] Critical Failure:", error);
            alert(`Brainia Error: ${error.message || "Failed to process share"}`);
            setShareState('idle');
        }
    };


    const handleAddClick = (type: 'text' | 'link' | 'image' | 'folder' | 'camera') => {
        setInputModalConfig({
            isOpen: true,
            type,
            title: type === 'folder' ? 'Create Folder' :
                type === 'camera' ? 'Capture Image' :
                    `Add ${type === 'image' ? 'Image' : type === 'link' ? 'Link URL' : 'Note'}`,
            placeholder: type === 'folder' ? 'Folder Name' : type === 'text' ? 'Note Title' : 'example.com',
            mode: type === 'camera' ? 'camera' : (type === 'image' ? 'file' : 'text')
        });
    };

    const handleAddSubmit = async (value: string) => {
        const { type } = inputModalConfig;
        if (!type) return;

        const id = generateId();
        const userId = session?.user?.id || 'unknown';

        if (type === 'folder') {
            addFolder({
                id, user_id: userId, name: value,
                parent_id: null,
                color: '#6e56cf',
                position_x: 0, position_y: 0, status: 'active',
                created_at: new Date().toISOString()
            });
        } else {
            let content = type === 'text' ? '' : value;
            let metadataTitle = type === 'text' ? value : 'New Idea';

            if (type === 'image' || type === 'camera') {
                const uploadedUrl = await uploadMobileFile(value, id, userId);
                if (uploadedUrl) {
                    content = uploadedUrl;
                }
            }

            if (type === 'link' && content && !/^https?:\/\//i.test(content)) {
                content = 'https://' + content;
            }

            await addItem({
                id, user_id: userId, type: (type === 'camera' ? 'image' : type) as any,
                content: content, status: activeTab === 'inbox' ? 'inbox' : 'active',
                position_x: 0, position_y: 0,
                created_at: new Date().toISOString(),
                metadata: { title: metadataTitle }
            });

            if (type === 'link') {
                const userId = session?.user?.id || 'unknown';
                // Trigger metadata AND screenshot
                const metadataUrl = getApiUrl('/api/metadata');
                fetch(metadataUrl, { method: 'POST', body: JSON.stringify({ url: content }) })
                    .then(res => res.json())
                    .then(data => updateItemContent(id, { metadata: data }))
                    .catch(err => {
                        if (err.name === 'AbortError') return;
                        console.error("Metadata fetch failed:", err);
                    });

                const screenshotUrl = getApiUrl('/api/screenshot');
                fetch(screenshotUrl, {
                    method: 'POST',
                    body: JSON.stringify({ url: content, itemId: id, userId })
                }).catch(err => console.error("Screenshot failed:", err));
            }
        }
    };

    const handleResultClick = (id: string, type: 'item' | 'folder') => {
        if (type === 'item') {
            setSelectedItemId(id);
        } else {
            setSelectedFolderId(id);
        }
    };


    const isSharing = shareState !== 'idle';

    return (
        <div className="mobile-app">
            {!isSharing && <MobileHeader onResultClick={handleResultClick} onArchiveClick={() => { setActiveTab('archive'); }} />}

            <div style={{
                paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
                paddingTop: 'calc(64px + env(safe-area-inset-top))',
                minHeight: '100vh',
                background: 'var(--background)',
                opacity: isSharing ? 0.4 : 1,
                filter: isSharing ? 'blur(10px)' : 'none',
                transition: 'all 0.3s ease'
            }}>
                {activeTab === 'home' ? (
                    <MobileHome
                        onItemClick={setSelectedItemId}
                        onFolderClick={setSelectedFolderId}
                    />
                ) : activeTab === 'inbox' ? (
                    <MobileInbox onItemClick={setSelectedItemId} />
                ) : (
                    <MobileArchive
                        onItemClick={setSelectedItemId}
                        onFolderClick={setSelectedFolderId}
                        onBack={() => setActiveTab('home')}
                    />
                )}
            </div>

            {!isSharing && (
                <MobileNav
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onAdd={handleAddClick}
                />
            )}

            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120vw',
                height: '120vw',
                maxWidth: '600px',
                maxHeight: '600px',
                zIndex: -1,
                opacity: 0.15,
                filter: 'blur(40px)',
                pointerEvents: 'none'
            }}>
                <Orb
                    hue={280}
                    hoverIntensity={0.5}
                    forceHoverState={true}
                    backgroundColor="transparent"
                />
            </div>

            <MobileSelectionBar />

            {isSharing && (
                <ShareProcessingOverlay
                    status={shareState}
                    isFadingOut={isOverlayFading}
                />
            )}


            {/* Modals */}
            {selectedItemId && (
                <ItemModal
                    itemId={selectedItemId}
                    onClose={() => { setSelectedItemId(null); clearSelection(); }}
                />
            )}
            {selectedFolderId && (
                <FolderModal
                    folderId={selectedFolderId}
                    onClose={() => { setSelectedFolderId(null); clearSelection(); }}
                    onItemClick={setSelectedItemId}
                />
            )}
            <InputModal
                isOpen={inputModalConfig.isOpen}
                onClose={() => setInputModalConfig({ ...inputModalConfig, isOpen: false })}
                onSubmit={handleAddSubmit}
                title={inputModalConfig.title}
                placeholder={inputModalConfig.placeholder}
                mode={inputModalConfig.mode}
            />

            <style jsx global>{`
                body {
                    overflow-y: auto !important;
                    background: ${shareState === 'idle' ? 'var(--background)' : 'transparent'};
                    transition: background 0.3s ease;
                }
                .mobile-app {
                    background: ${shareState === 'idle' ? 'var(--background)' : 'transparent'};
                }
            `}</style>
        </div>
    );
}

