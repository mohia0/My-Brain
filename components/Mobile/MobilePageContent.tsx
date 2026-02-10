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
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://mybrainia.vercel.app';

    const getApiUrl = (endpoint: string) => {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

        if (Capacitor.isNativePlatform()) {
            const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
            return `${cleanBase}${cleanEndpoint}`;
        }

        // On web/browser, relative paths are safest and handle protocol/origin automatically
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

    const { items, folders, selectedIds, addItem, addFolder, clearSelection, updateItemContent, fetchData } = useItemsStore();

    useEffect(() => { selectedItemIdRef.current = selectedItemId; }, [selectedItemId]);
    useEffect(() => { selectedFolderIdRef.current = selectedFolderId; }, [selectedFolderId]);
    useEffect(() => { inputModalOpenRef.current = inputModalConfig.isOpen; }, [inputModalConfig.isOpen]);
    useEffect(() => { selectionCountRef.current = selectedIds.length; }, [selectedIds.length]);

    // Prevent double-processing of the same intent (common in Capacitor)
    const processedIntentRef = React.useRef<{ hash: string; time: number } | null>(null);
    const hasFiredListenerRef = React.useRef<boolean>(false);

    useEffect(() => {
        let intentListener: any = null;

        const initCapacitor = async () => {
            if (!Capacitor.isNativePlatform()) return;

            try {
                const { registerPlugin } = await import('@capacitor/core');

                // 1. Handle Sharing Intents
                const SendIntent = registerPlugin<any>('SendIntent');

                if (SendIntent) {
                    // Store listener so we can remove it
                    intentListener = await SendIntent.addListener('appSendActionIntent', (data: any) => {

                        hasFiredListenerRef.current = true;
                        handleSharedContent(data);
                    });

                    // Only check on cold start if listener hasn't fired yet
                    // This prevents double-triggering on splash screen apps
                    setTimeout(async () => {
                        if (hasFiredListenerRef.current) {

                            return;
                        }

                        if (typeof SendIntent.checkSendIntentReceived === 'function') {
                            try {
                                const result = await SendIntent.checkSendIntentReceived();
                                if (result && (result.value || result.extras || result.files)) {

                                    handleSharedContent(result);
                                }
                            } catch (e) {

                            }
                        }
                    }, 800);
                }

                // 2. Handle System Back Button (Android)
                const AppPlugin = registerPlugin<any>('App');
                if (AppPlugin) {


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
                }
            } catch (err) {
                console.error("Capacitor registration error:", err);
            }
        };

        initCapacitor();

        return () => {
            if (intentListener) intentListener.remove();
            try {
                const cap = (window as any).Capacitor;
                if (cap?.Plugins?.App?.removeAllListeners) cap.Plugins.App.removeAllListeners();
            } catch (e) { }
        };
    }, []);


    const uploadMobileFile = async (uri: string, itemId: string, userId: string): Promise<string | null> => {

        try {
            // Ensure we have a usable URI
            const pocketUri = (uri.startsWith('data:') || uri.startsWith('http')) ? uri : Capacitor.convertFileSrc(uri);

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

                    await new Promise(r => setTimeout(r, 500));
                }
            }

            if (!response || !response.ok) {
                console.error(`[MobileUpload] Fetch failed after retries: ${response?.statusText || fetchError} `);
                throw new Error(`Fetch failed: ${response?.statusText || fetchError} `);
            }

            const blob = await response.blob();


            if (blob.size < 10) {

            }

            // Ensure valid mime type
            const mimeType = blob.type || 'image/jpeg';
            const extension = mimeType.split('/')[1] || 'jpg';
            const filename = `${userId}/${itemId}_capture.${extension}`;


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


            return publicUrl;
        } catch (err) {
            console.error("[MobileUpload] Critical failure in uploadMobileFile:", err);
            return null;
        }
    };

    const handleSharedContent = async (intent: any) => {
        if (!intent) return;
        hasFiredListenerRef.current = true; // Signal we are already processing

        // 1. Initial UI Feedback
        setActiveTab('inbox');
        setShareState('capturing');
        setIsOverlayFading(false);

        try {
            const data = intent.value || intent;
            const extras = intent.extras || {};
            const userId = session?.user?.id || 'unknown';

            // --- DATA PRE-EXTRACTION ---
            let rawText = (extras['android.intent.extra.TEXT'] || extras['android.intent.extra.PROCESS_TEXT'] || data.value || data.text || data.url || "").toString().trim();
            const intentTitle = (data.title || data.subject || extras['android.intent.extra.SUBJECT'] || "").toString().trim();

            // Extract URLs immediately for deduplication
            const urlRegex = /(?:https?:\/\/|www\.)[^\s\r\n\(\)\[\]\{\}\>\<\"\'\^]+(?:\.[^\s\r\n\(\)\[\]\{\}\>\<\"\'\^]+)*/gi;
            const allUrlMatches = [...(rawText.match(urlRegex) || []), ...(intentTitle.match(urlRegex) || []), ...(data.url ? [data.url] : [])];
            const bestUrl = allUrlMatches.sort((a, b) => b.length - a.length)[0] || null;

            // --- DE-DUPLICATION (STABILIZED) ---
            // Normalize the check string (remove http/www for the hash)
            const normalizedUrl = bestUrl ? bestUrl.toLowerCase()
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .replace(/\/$/, '') : null;

            const intentHash = normalizedUrl ? `url:${normalizedUrl}` : `text:${rawText.substring(0, 50)}`;

            if (processedIntentRef.current && processedIntentRef.current.hash === intentHash && Date.now() - processedIntentRef.current.time < 5000) {

                setShareState('idle');
                return;
            }
            processedIntentRef.current = { hash: intentHash, time: Date.now() };

            // --- INTEGRITY CHECK (AVOID BROKEN CARDS) ---
            const processedFiles = data.files || [];
            const hasEnoughText = rawText.length > 5;
            if (!bestUrl && processedFiles.length === 0 && !hasEnoughText) {
                setShareState('idle');
                return;
            }

            // --- FINAL URL & DESCRIPTION ---
            let finalUrl = bestUrl;
            if (finalUrl) {
                finalUrl = finalUrl.trim();
                finalUrl = finalUrl.replace(/[\.\,\?\#\!\;\:]+$/, "");
                if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
            }

            let description = rawText;
            if (finalUrl && bestUrl) {
                const escapedUrl = bestUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                description = rawText.replace(new RegExp(escapedUrl, 'gi'), "").trim();
                if (finalUrl.includes('facebook') || finalUrl.includes('instagram')) {
                    description = description.replace(/\.com\/[^\s]*/gi, "").trim();
                }
                description = description.replace(/^[:\-–—\s\u2013\u2014]+|[:\-–—\s\u2013\u2014]+$/g, "");
            }

            // --- FILE HANDLING ---
            if (processedFiles.length === 0) {
                const streamUri = extras['android.intent.extra.STREAM'] || data.uri || data.path;
                if (streamUri) {
                    const finalUris = Array.isArray(streamUri) ? streamUri : [streamUri];
                    for (const uri of finalUris) {
                        if (!uri) continue;
                        const uriStr = uri.toString();
                        const mime = data.mimeType || data.type || "";
                        const isImg = mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(uriStr) || uriStr.startsWith('content://');
                        if (isImg || mime.startsWith('video/')) {
                            processedFiles.push({ uri: uriStr, mimeType: mime || (isImg ? 'image/jpeg' : 'video/mp4') });
                        }
                    }
                }
            }

            // --- ITEM CREATION ---
            setShareState('saving');
            const itemId = generateId();
            let itemType: 'text' | 'link' | 'image' | 'video' = finalUrl ? 'link' : 'text';
            let itemContent = finalUrl || rawText;

            let initialTitle = intentTitle;
            if (finalUrl && (!initialTitle || /shared link|sharedlink/i.test(initialTitle))) {
                try {
                    const domain = new URL(finalUrl).hostname.replace('www.', '').split('.')[0];
                    initialTitle = domain.charAt(0).toUpperCase() + domain.slice(1);
                } catch (e) {
                    initialTitle = "Idea Note";
                }
            } else if (!initialTitle) {
                initialTitle = "Idea Note";
            }

            let metadata: any = { title: initialTitle, description: description || rawText, source: 'mobile-share' };

            // Handle first file as primary if present
            if (processedFiles.length > 0) {
                const file = processedFiles[0];
                const isImg = file.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.uri);
                const isVid = file.mimeType?.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(file.uri);
                if (isImg || isVid) {
                    const uploaded = await uploadMobileFile(file.uri, itemId, userId);
                    if (uploaded) {
                        if (finalUrl) { metadata.image = uploaded; metadata.isVideo = isVid; }
                        else { itemType = isVid ? 'video' : 'image'; itemContent = uploaded; metadata.isVideo = isVid; }
                    }
                }
            }

            await addItem({
                id: itemId, user_id: userId, type: itemType, content: itemContent,
                status: 'inbox', metadata: metadata, position_x: 0, position_y: 0,
                created_at: new Date().toISOString()
            });

            // --- ENRICHMENT ---
            if (finalUrl) {
                // ENRICHMENT: Metadata
                try {
                    const metaUrl = getApiUrl('/api/metadata');
                    fetch(metaUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: finalUrl, itemId, userId })
                    }).then(async r => {
                        if (!r.ok) throw new Error(`HTTP ${r.status}`);
                        const newM = await r.json();
                        if (newM && !newM.error) {
                            const existing = useItemsStore.getState().items.find(i => i.id === itemId);
                            updateItemContent(itemId, { metadata: { ...existing?.metadata, ...newM, source: 'mobile-enriched' } });
                        }
                    }).catch(e => console.error(`[MobileShare] Metadata failed (${metaUrl}):`, e.message));
                } catch (e) {
                    console.error("[MobileShare] Metadata trigger error:", e);
                }

                // ENRICHMENT: Screenshot
                setTimeout(() => {
                    try {
                        const shotUrl = getApiUrl('/api/screenshot');
                        fetch(shotUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: finalUrl, itemId, userId })
                        }).catch(e => console.error(`[MobileShare] Screenshot failed (${shotUrl}):`, e.message));
                    } catch (e) {
                        console.error("[MobileShare] Screenshot trigger error:", e);
                    }
                }, 1200);
            }

            setShareState('saved');
            setTimeout(() => {
                setIsOverlayFading(true);
                // Safety sync - ensure store is perfectly up to date
                fetchData().catch(() => { });
                setTimeout(() => { setShareState('idle'); setIsOverlayFading(false); }, 500);
            }, 1000);

        } catch (error: any) {
            console.error("[MobileShare] Failure:", error);
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

            if (type === 'link' && value) {
                try {
                    const domain = new URL(value.startsWith('http') ? value : `https://${value}`).hostname.replace('www.', '').split('.')[0];
                    metadataTitle = domain.charAt(0).toUpperCase() + domain.slice(1);
                } catch (e) {
                    metadataTitle = "New Link";
                }
            }

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
                // Trigger metadata AND screenshot
                try {
                    const metadataUrl = getApiUrl('/api/metadata');
                    fetch(metadataUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: content, itemId: id, userId })
                    })
                        .then(async res => {
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            return res.json();
                        })
                        .then(data => updateItemContent(id, { metadata: data }))
                        .catch(err => console.error(`[MobileAdd] Metadata failed (${metadataUrl}):`, err));
                } catch (e) {
                    console.error("[MobileAdd] Metadata trigger error:", e);
                }

                setTimeout(() => {
                    try {
                        const screenshotUrl = getApiUrl('/api/screenshot');
                        fetch(screenshotUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: content, itemId: id, userId })
                        }).catch(err => console.error(`[MobileAdd] Screenshot failed (${screenshotUrl}):`, err));
                    } catch (e) {
                        console.error("[MobileAdd] Screenshot trigger error:", e);
                    }
                }, 800);
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

