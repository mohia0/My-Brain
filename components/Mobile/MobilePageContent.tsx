"use client";

import React, { useEffect, useState } from 'react';
import MobileHeader from './MobileHeader';
import MobileNav from './MobileNav';
import MobileHome from './MobileHome';
import MobileInbox from './MobileInbox';
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
    const [activeTab, setActiveTab] = useState<'home' | 'inbox'>('home');
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
                // Accessing via window as Capacitor.Plugins is deprecated in Capacitor 3+
                const cap = (window as any).Capacitor;
                const SendIntent = cap?.Plugins?.SendIntent;

                if (SendIntent) {
                    if (SendIntent.removeAllListeners) { try { await SendIntent.removeAllListeners(); } catch (e) { } }
                    SendIntent.addListener('appSendActionIntent', (data: any) => {
                        console.log("[MobileShare] Listener triggered", !!data);
                        handleSharedContent(data);
                    });

                    if (SendIntent.checkSendIntentReceived) {
                        const result = await SendIntent.checkSendIntentReceived();
                        if (result && (result.value || result.extras)) {
                            console.log("[MobileShare] Cold start share detected");
                            handleSharedContent(result);
                        }
                    }
                }

                // 2. Handle System Back Button (Android)
                const AppPlugin = (window as any).Capacitor?.Plugins?.App;
                if (AppPlugin) {
                    console.log("[MobileInit] Setting up Back Button listener");
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
        ).trim();

        // Robust file detection
        let processedFiles = data.files || [];

        // Check for single file in extra stream (Standard Android approach)
        const streamUri = extras['android.intent.extra.STREAM'];
        const dataUri = data.uri || data.path; // ONLY use uri/path for files, not .url

        if (processedFiles.length === 0 && (streamUri || dataUri)) {
            const finalUri = streamUri || dataUri;
            const mime = data.mimeType || data.type || "";
            const uriStr = finalUri.toString();
            console.log(`[MobileShare] Single Stream/Data URI detected: ${uriStr}, Mime: ${mime}`);

            const definitelyImage = mime.startsWith('image/') ||
                /\.(jpg|jpeg|png|gif|webp)$/i.test(uriStr) ||
                uriStr.includes('com.google.android.apps.photos.contentprovider') ||
                uriStr.startsWith('content://');

            if (definitelyImage || mime.startsWith('video/')) {
                processedFiles = [{
                    uri: finalUri,
                    mimeType: mime || (definitelyImage ? 'image/jpeg' : 'application/octet-stream'),
                    name: data.name || "Shared Idea"
                }];
                console.log("[MobileShare] Auto-packaged single stream share");
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
            return;
        }

        // Detect URL
        const urlRegex = /(https?:\/\/[^\s]+)/i;
        const urlMatch = textContent.match(urlRegex);
        const finalUrl = data.url || (urlMatch ? urlMatch[0] : null);
        const isUrl = !!finalUrl;

        console.log("[MobileShare] Identification:", { isUrl, finalUrl, hasFiles, filesCount: data.files?.length });

        setShareState('saving');
        setIsOverlayFading(false);

        try {
            const userId = session?.user?.id || 'unknown';
            console.log(`[MobileShare] Processing for User: ${userId}`);

            // 1. Process as URL or Text
            // We ALWAYS process this if it exists, even if there are files
            // (e.g. sharing a link with a thumbnail image)
            if (textContent || finalUrl) {
                const itemId = generateId();
                console.log(`[MobileShare] Creating ${isUrl ? 'Link' : 'Text'} item: ${itemId}`);
                await addItem({
                    id: itemId,
                    user_id: userId,
                    type: isUrl ? 'link' : 'text',
                    content: finalUrl || textContent,
                    status: 'active',
                    metadata: {
                        title: intentTitle || (isUrl ? "Shared Link" : "Idea Note"),
                        description: isUrl ? "Captured from Mobile" : "Shared from Mobile"
                    },
                    position_x: 0, position_y: 0,
                    created_at: new Date().toISOString()
                });

                if (isUrl) {
                    setShareState('capturing');
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    fetch(`${origin}/api/screenshot`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: finalUrl, itemId, userId })
                    }).catch(err => console.error("[MobileShare] Screenshot trigger failed:", err));
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
                        status: 'active',
                        metadata: {
                            title: file.name || intentTitle || (isImage ? "Idea Capture" : "Video Capture"),
                            description: textContent || `Shared via mobile`,
                            isVideo: isVideo
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
                content: content, status: 'active',
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
            {!isSharing && <MobileHeader onResultClick={handleResultClick} />}

            <div style={{
                paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
                paddingTop: 'calc(64px + env(safe-area-inset-top))',
                minHeight: '100vh',
                background: '#000',
                opacity: isSharing ? 0.4 : 1,
                filter: isSharing ? 'blur(10px)' : 'none',
                transition: 'all 0.3s ease'
            }}>
                {activeTab === 'home' ? (
                    <MobileHome
                        onItemClick={setSelectedItemId}
                        onFolderClick={setSelectedFolderId}
                    />
                ) : (
                    <MobileInbox onItemClick={setSelectedItemId} />
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
                    background: ${shareState === 'idle' ? '#000' : 'transparent'};
                    transition: background 0.3s ease;
                }
                .mobile-app {
                    background: ${shareState === 'idle' ? '#000' : 'transparent'};
                }
            `}</style>
        </div>
    );
}

