"use client";

import React, { useEffect, useState } from 'react';
import MobileHeader from './MobileHeader';
import MobileNav from './MobileNav';
import MobileHome from './MobileHome';
import MobileInbox from './MobileInbox';
import MobileArchive from './MobileArchive';
import MobileAddButton from './MobileAddButton';
import ShareProcessingOverlay from './ShareProcessingOverlay';
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

    // Helper to get full API URL
    const getApiUrl = (endpoint: string) => {
        // If we are on a custom domain/IP (Live Reload), use relative paths
        if (typeof window !== 'undefined' &&
            window.location.hostname !== 'localhost' &&
            window.location.hostname !== '127.0.0.1' &&
            !window.location.hostname.includes('vercel.app')) {
            // We are likely on a local IP like 192.168.x.x
            return endpoint;
        }

        // FAILSAFE: If we are running strictly natively (file:// or localhost on device)
        // AND we want to debug locally, we need to point to the computer's IP.
        // However, for now let's point to PROD if we can't detect a local server.

        // Check if we are in extended dev mode (you can set this manually if needed)
        // const DEV_IP = "http://192.168.1.12:3000"; // UNCOMMENT and set your PC IP to test locally on physical device without Live Reload

        if (Capacitor.isNativePlatform()) {
            // if (DEV_IP) return `${DEV_IP}${endpoint}`; 
            return `${API_BASE}${endpoint}`;
        }

        return endpoint;
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
                // 1. Handle Sharing Intents
                console.log("[MobileInit] Initializing SendIntent. User:", session?.user?.id);

                // Modern Capacitor 3+ way to register/access plugins
                const { registerPlugin } = await import('@capacitor/core');
                const SendIntent = registerPlugin<any>('SendIntent');

                if (SendIntent) {
                    // Remove existing listeners to avoid duplicates, but only for the App plugin
                    // For SendIntent, we want to keep the retained event if it's a cold start

                    SendIntent.addListener('appSendActionIntent', (data: any) => {
                        console.log("[MobileShare] Listener triggered", !!data);
                        handleSharedContent(data);
                    });

                    // Check for cold start share
                    // Note: Some versions of the plugin don't support this, so we check existence
                    if (typeof SendIntent.checkSendIntentReceived === 'function') {
                        try {
                            const result = await SendIntent.checkSendIntentReceived();
                            if (result && (result.value || result.extras || result.files)) {
                                console.log("[MobileShare] Cold start share detected via checkSendIntentReceived");
                                handleSharedContent(result);
                            }
                        } catch (e) {
                            console.warn("[MobileShare] checkSendIntentReceived failed or not implemented", e);
                        }
                    }
                }

                // 2. Handle System Back Button (Android)
                const AppPlugin = registerPlugin<any>('App');
                if (AppPlugin) {
                    console.log("[MobileInit] Setting up Back Button listener");
                    // Important: remove previous listeners for App to avoid multiple fires on re-renders
                    if (AppPlugin.removeAllListeners) {
                        try { await AppPlugin.removeAllListeners(); } catch (e) { }
                    }

                    AppPlugin.addListener('backButton', (data: { canGoBack: boolean }) => {
                        const backEvent = new CustomEvent('systemBack', { cancelable: true });
                        window.dispatchEvent(backEvent);

                        if (backEvent.defaultPrevented) {
                            console.log("Back event handled by component");
                            return;
                        }

                        if (inputModalOpenRef.current) {
                            setInputModalConfig(prev => ({ ...prev, isOpen: false }));
                        } else if (selectedFolderIdRef.current) {
                            setSelectedFolderId(null);
                        } else if (selectedItemIdRef.current) {
                            setSelectedItemId(null);
                        } else if (selectionCountRef.current > 0) {
                            clearSelection();
                        } else {
                            if (data.canGoBack) {
                                window.history.back();
                            } else {
                                console.log("No UI state active, exiting app");
                                AppPlugin.exitApp();
                            }
                        }
                    });
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
        if (!data) {
            console.error("[MobileShare] Received NULL data in handleSharedContent");
            return;
        }
        console.log("[MobileShare] 1. Received RAW Data STRING:", JSON.stringify(data));
        console.log("[MobileShare] 1. Received RAW Data OBJECT:", data);

        // Immediately update UI to show processing
        setActiveTab('inbox');
        setShareState('capturing'); // Start with capturing/processing state

        // Log the API URL being used
        console.log("[MobileShare] 2. Checking API Configuration...");
        const metaTestUrl = getApiUrl('/api/metadata');
        console.log(`[MobileShare] 2. Resolved API Metadata Endpoint: ${metaTestUrl}`);
        if (typeof window !== 'undefined') {
            console.log(`[MobileShare] 2. Window Hostname: ${window.location.hostname}`);
            console.log(`[MobileShare] 2. Window Origin: ${window.location.origin}`);
        }

        const extras = data.extras || {};
        const intentTitle = data.title || data.subject || extras['android.intent.extra.SUBJECT'] || "";

        // Comprehensive text extraction
        const textContent = (
            extras['android.intent.extra.TEXT'] ||
            extras['android.intent.extra.PROCESS_TEXT'] ||
            data.value ||
            data.text ||
            data.url ||
            ""
        ).toString().trim();

        // Robust file detection
        let processedFiles = data.files || [];

        // Check for file in extra stream (Standard Android approach)
        const streamUri = extras['android.intent.extra.STREAM'];
        const dataUri = data.uri || data.path;

        if (processedFiles.length === 0 && (streamUri || dataUri)) {
            const finalUris = Array.isArray(streamUri) ? streamUri : [streamUri || dataUri];

            for (const uri of finalUris) {
                if (!uri) continue;
                const uriStr = uri.toString();
                const mime = data.mimeType || data.type || "";

                console.log(`[MobileShare] Processing URI: ${uriStr}, Mime: ${mime}`);

                const definitelyImage = mime.startsWith('image/') ||
                    /\.(jpg|jpeg|png|gif|webp)$/i.test(uriStr) ||
                    uriStr.includes('com.google.android.apps.photos.contentprovider') ||
                    uriStr.startsWith('content://');

                // Basic filter to avoid processing text as file
                if (definitelyImage || mime.startsWith('video/') || mime === 'application/pdf' || mime === '*/*') {
                    processedFiles.push({
                        uri: uriStr,
                        mimeType: mime || (definitelyImage ? 'image/jpeg' : 'application/octet-stream'),
                        name: data.name || "Shared Item"
                    });
                }
            }
        }
        const hasFiles = processedFiles.length > 0;

        console.log("[MobileShare] Payload Analysis:", {
            hasFiles,
            processedCount: processedFiles.length,
            textContent: textContent ? (textContent.substring(0, 30) + "...") : "NONE",
            sessionActive: !!session
        });

        if (!textContent && !hasFiles) {
            console.warn("[MobileShare] Empty share - ignoring");
            // Only reset if we really have nothing. 
            // Sometimes it takes a moment for stream to be ready? No, data should be here.
            setShareState('idle');
            return;
        }

        // Improved URL Detection regex (handles surrounding text better)
        // Matches http/https URLs, ignores trailing punctuation like . , )
        const urlRegex = /(https?:\/\/[^\s\.,"'!]+)/i;
        const urlMatch = textContent.match(urlRegex);

        // Prioritize data.url, then regex match
        let finalUrl = data.url || (urlMatch ? urlMatch[0] : null);

        // Sanity check URL
        if (finalUrl && !finalUrl.startsWith('http')) finalUrl = null;

        const isUrl = !!finalUrl;

        // Improve Title extraction
        let cleanTitle = intentTitle;
        if (!cleanTitle && textContent) {
            if (isUrl) {
                // If it's a URL share, try to remove the URL from text to find a title/caption
                const candidate = textContent.replace(finalUrl, "").trim();
                if (candidate.length > 0) {
                    cleanTitle = candidate.length > 50 ? candidate.substring(0, 47) + "..." : candidate;
                }
            } else {
                cleanTitle = textContent.length > 50 ? textContent.substring(0, 47) + "..." : textContent;
            }
        }

        console.log("[MobileShare] Identification:", { isUrl, finalUrl, hasFiles, filesCount: data.files?.length });

        setShareState('saving');
        setIsOverlayFading(false); // Ensure overlay is visible

        try {
            const userId = session?.user?.id || 'unknown';

            // 1. Process as URL or Text
            // We prioritize files if present, but if there is text/URL we also save it (or as metadata)
            // Strategy: If there are files, save text as description of the first file?
            // OR: If it is a distinct URL, save it as a separate item?
            // Current approach: Independent items.

            // EXCEPT: If the text is just the URL, and we have a file, ignore the text item?
            // No, let's capture everything to be safe.

            if (!hasFiles || (textContent !== finalUrl)) {
                const itemId = generateId();
                await addItem({
                    id: itemId,
                    user_id: userId,
                    type: isUrl ? 'link' : 'text',
                    content: finalUrl || textContent,
                    status: 'inbox',
                    metadata: {
                        title: cleanTitle || (isUrl ? "Shared Link" : "Idea Note"),
                        description: textContent !== finalUrl ? textContent : (isUrl ? "Captured from Mobile" : "Shared from Mobile"),
                        source: 'share'
                    },
                    position_x: 0, position_y: 0,
                    created_at: new Date().toISOString()
                });

                if (isUrl) {
                    // Trigger backend processing
                    const metadataUrl = getApiUrl('/api/metadata');
                    fetch(metadataUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: finalUrl })
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.title || data.image) {
                                updateItemContent(itemId, { metadata: { ...data, source: 'share-og' } });
                            }
                        })
                        .catch(e => console.error("[MobileShare] OG Metadata failed:", e));

                    const screenshotUrl = getApiUrl('/api/screenshot');
                    fetch(screenshotUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: finalUrl, itemId, userId })
                    }).catch(err => console.error("[MobileShare] Screenshot trigger failed:", err));
                }
            }


            // 2. Process Files
            if (hasFiles) {
                for (const file of processedFiles) {
                    const fileId = generateId();
                    const mime = file.mimeType || file.type || "";
                    const fileUri = file.uri || file.path || file.url || "";

                    // Logic to upload file...
                    const isImage = mime.startsWith('image/') ||
                        (typeof fileUri === 'string' && (
                            /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUri) ||
                            fileUri.startsWith('content://') ||
                            fileUri.includes('com.google.android.apps.photos.contentprovider')
                        ));
                    const isVideo = mime.startsWith('video/') ||
                        (typeof fileUri === 'string' && /\.(mp4|mov|avi|mkv|webm)$/i.test(fileUri));

                    if (!fileUri) continue;

                    let finalFileContent = "";
                    let uploadCommit = false;

                    if (isImage || isVideo) {
                        // Try uploading
                        const uploaded = await uploadMobileFile(fileUri.toString(), fileId, userId);
                        if (uploaded) {
                            finalFileContent = uploaded;
                            uploadCommit = true;
                        } else {
                            console.warn(`[MobileShare] Failed to upload ${mime}, fallback to local URI disabled (unusable remotely)`);
                            // If upload fails, we skip creating the item to avoid "broken" items in the cloud
                            // But maybe we should save it with a "failed" status?
                            // For now, let's skip.
                            continue;
                        }
                    } else {
                        // Non-media files (skip for now or better handling later)
                        if (fileUri.toString().startsWith('content://')) continue;
                        finalFileContent = fileUri.toString();
                    }

                    await addItem({
                        id: fileId,
                        user_id: userId,
                        type: isVideo ? 'video' : 'image',
                        content: finalFileContent,
                        status: 'inbox',
                        metadata: {
                            title: file.name || intentTitle || (isImage ? "Idea Capture" : "Video Capture"),
                            description: textContent || `Shared via mobile`,
                            isVideo: isVideo,
                            source: 'share',
                            originalUri: fileUri.toString() // Debug info
                        },
                        position_x: 0, position_y: 0,
                        created_at: new Date().toISOString()
                    });
                }
            }

            setShareState('saved');

            // Reduced delay for snappier feel
            setTimeout(() => {
                setIsOverlayFading(true);
                // Force a refresh of data to ensure UI is in sync
                useItemsStore.getState().fetchData();

                setTimeout(() => {
                    setShareState('idle');
                    setIsOverlayFading(false);
                }, 500);
            }, 1500); // 1.5s display time for success message

        } catch (error) {
            console.error("[MobileShare] Critical Error:", error);
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

