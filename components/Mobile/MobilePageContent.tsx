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
            const pocketUri = (uri.startsWith('data:') || uri.startsWith('http')) ? uri : Capacitor.convertFileSrc(uri);
            console.log(`[MobileUpload] Converted URI: ${pocketUri.substring(0, 100)}...`);

            if (!pocketUri || pocketUri === "") {
                throw new Error("Converted URI is empty");
            }

            const response = await fetch(pocketUri);
            if (!response.ok) {
                console.error(`[MobileUpload] Fetch failed with status: ${response.status} ${response.statusText}`);
                throw new Error(`Fetch failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            console.log(`[MobileUpload] Blob info: size=${blob.size}, type=${blob.type}`);

            if (blob.size < 10) {
                console.warn("[MobileUpload] Blob is suspiciously small, might be empty");
            }

            const extension = blob.type.split('/')[1] || 'jpg';
            const filename = `${userId}/${itemId}_capture.${extension}`;

            console.log(`[MobileUpload] Attempting Supabase upload to: ${filename}`);
            const { error } = await supabase.storage
                .from('screenshots')
                .upload(filename, blob, {
                    contentType: blob.type || 'image/jpeg',
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
        console.log("[MobileShare] Received RAW Data:", JSON.stringify(data));

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

                if (definitelyImage || mime.startsWith('video/')) {
                    processedFiles.push({
                        uri: uriStr,
                        mimeType: mime || (definitelyImage ? 'image/jpeg' : 'application/octet-stream'),
                        name: data.name || "Shared Item"
                    });
                }
            }
            console.log(`[MobileShare] Auto-packaged ${processedFiles.length} stream share(s)`);
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
            return;
        }

        // Detect URL
        const urlRegex = /(https?:\/\/\S+)/i;
        const urlMatch = textContent.match(urlRegex);
        const finalUrl = data.url || (urlMatch ? urlMatch[0] : null);
        const isUrl = !!finalUrl;

        // Improve Title extraction (e.g. Instagram captions)
        let cleanTitle = intentTitle;
        if (!cleanTitle && textContent) {
            if (isUrl) {
                const candidate = textContent.replace(finalUrl, "").trim();
                if (candidate.length > 2) {
                    cleanTitle = candidate.length > 80 ? candidate.substring(0, 77) + "..." : candidate;
                }
            } else {
                cleanTitle = textContent.length > 80 ? textContent.substring(0, 77) + "..." : textContent;
            }
        }

        console.log("[MobileShare] Identification:", { isUrl, finalUrl, hasFiles, filesCount: data.files?.length });

        setShareState('saving');
        setIsOverlayFading(false);

        try {
            const userId = session?.user?.id || 'unknown';
            console.log(`[MobileShare] Processing for User: ${userId}`);

            // 1. Process as URL or Text
            if (textContent || finalUrl) {
                const itemId = generateId();
                console.log(`[MobileShare] Creating ${isUrl ? 'Link' : 'Text'} item: ${itemId}`);
                await addItem({
                    id: itemId,
                    user_id: userId,
                    type: isUrl ? 'link' : 'text',
                    content: finalUrl || textContent,
                    status: 'inbox',
                    metadata: {
                        title: cleanTitle || (isUrl ? "Shared Link" : "Idea Note"),
                        description: isUrl ? "Captured from Mobile" : "Shared from Mobile",
                        source: 'share'
                    },
                    position_x: 0, position_y: 0,
                    created_at: new Date().toISOString()
                });

                if (isUrl) {
                    setShareState('capturing');

                    console.log(`[MobileShare] Fetching metadata for: ${finalUrl}`);

                    // 1. Quick Metadata (OG Tags) - Very high success rate for social media
                    fetch('/api/metadata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: finalUrl })
                    })
                        .then(res => res.json())
                        .then(data => {
                            console.log('[MobileShare] Metadata received:', data);
                            if (data.title || data.image) {
                                updateItemContent(itemId, { metadata: { ...data, source: 'share-og' } });
                            }
                        })
                        .catch(e => console.error("[MobileShare] OG Metadata failed:", e));

                    // 2. Full Screenshot / Visual Preview
                    fetch(`/api/screenshot`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: finalUrl, itemId, userId })
                    })
                        .then(res => res.json())
                        .then(data => console.log('[MobileShare] Screenshot result:', data))
                        .catch(err => console.error("[MobileShare] Screenshot trigger failed:", err));
                }
            }

            // 2. Process Files (Gallery / Screenshots)
            if (hasFiles) {
                console.log(`[MobileShare] Processing ${processedFiles.length} files...`);
                for (const file of processedFiles) {
                    const fileId = generateId();
                    const mime = file.mimeType || file.type || "";
                    const fileUri = file.uri || file.path || file.url || "";

                    const isImage = mime.startsWith('image/') ||
                        (typeof fileUri === 'string' && (
                            /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUri) ||
                            fileUri.startsWith('content://') ||
                            fileUri.includes('com.google.android.apps.photos.contentprovider')
                        ));
                    const isVideo = mime.startsWith('video/') ||
                        (typeof fileUri === 'string' && /\.(mp4|mov|avi|mkv|webm)$/i.test(fileUri));

                    if (!fileUri) {
                        console.warn("[MobileShare] Skipping file with no URI");
                        continue;
                    }

                    console.log(`[MobileShare] File detected: mime=${mime}, isImage=${isImage}, isVideo=${isVideo}, uri=${fileUri.toString().substring(0, 50)}...`);

                    const finalFileUri = fileUri.toString();
                    let finalFileContent = "";

                    if (isImage || isVideo) {
                        console.log(`[MobileShare] Processing ${isImage ? 'Image' : 'Video'}: ${finalFileUri.substring(0, 50)}...`);
                        const uploaded = await uploadMobileFile(finalFileUri, fileId, userId);
                        if (uploaded) {
                            finalFileContent = uploaded;
                            console.log(`[MobileShare] ${isImage ? 'Image' : 'Video'} Uploaded Successfully: ${uploaded}`);
                        } else {
                            console.error(`[MobileShare] ${isImage ? 'Image' : 'Video'} upload failed - skipping this file`);
                            continue;
                        }
                    } else {
                        // For non-images, we just use the URI for now (e.g. docs) 
                        if (finalFileUri.startsWith('content://')) {
                            console.warn("[MobileShare] Skipping non-image content:// URI as it cannot be accessed remotely");
                            continue;
                        }
                        finalFileContent = finalFileUri;
                    }

                    await addItem({
                        id: fileId,
                        user_id: userId,
                        type: 'image', // Use 'image' as type to bypass DB constraints, use metadata.isVideo for logic
                        content: finalFileContent,
                        status: 'inbox',
                        metadata: {
                            title: file.name || intentTitle || (isImage ? "Idea Capture" : "Video Capture"),
                            description: textContent || `Shared via mobile`,
                            isVideo: isVideo,
                            source: 'share'
                        },
                        position_x: 0, position_y: 0,
                        created_at: new Date().toISOString()
                    });
                }
            }

            setShareState('saved');
            setTimeout(() => setIsOverlayFading(true), 600);
            setTimeout(() => {
                setShareState('idle');
                setIsOverlayFading(false);

                // "Work like hack" - Exit the app after sharing to return to the original app
                const cap = (window as any).Capacitor;
                if (cap?.Plugins?.App?.exitApp) {
                    console.log("[MobileShare] Auto-exiting app after successful share");
                    cap.Plugins.App.exitApp();
                }
            }, 1000);

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
                fetch('/api/metadata', { method: 'POST', body: JSON.stringify({ url: content }) })
                    .then(res => res.json())
                    .then(data => updateItemContent(id, { metadata: data }))
                    .catch(err => {
                        if (err.name === 'AbortError') return;
                        console.error("Metadata fetch failed:", err);
                    });

                fetch('/api/screenshot', {
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

