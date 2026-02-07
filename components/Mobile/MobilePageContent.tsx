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
import { useItemsStore } from '@/lib/store/itemsStore';
import { supabase } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';
import { generateId } from '@/lib/utils';



// We access SendIntent dynamically to avoid Capacitor 2 build errors

export default function MobilePageContent({ session }: { session: any }) {
    const { addItem, addFolder, clearSelection, updateItemContent } = useItemsStore();
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

    useEffect(() => { selectedItemIdRef.current = selectedItemId; }, [selectedItemId]);
    useEffect(() => { selectedFolderIdRef.current = selectedFolderId; }, [selectedFolderId]);
    useEffect(() => { inputModalOpenRef.current = inputModalConfig.isOpen; }, [inputModalConfig.isOpen]);

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
                const AppPlugin = cap.Plugins.App;
                if (AppPlugin) {
                    // Remove existing listeners before adding a new one
                    if (AppPlugin.removeAllListeners) { try { await AppPlugin.removeAllListeners(); } catch (e) { } }

                    AppPlugin.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
                        console.log("Back button event. canGoBack:", canGoBack);

                        if (inputModalOpenRef.current) {
                            setInputModalConfig(prev => ({ ...prev, isOpen: false }));
                        } else if (selectedFolderIdRef.current) {
                            setSelectedFolderId(null);
                        } else if (selectedItemIdRef.current) {
                            setSelectedItemId(null);
                        } else {
                            if (canGoBack) {
                                window.history.back();
                            } else {
                                // Double check if we really want to exit
                                console.log("No modals open and no history. Exiting app...");
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

        // Check for single file in various fields
        const singleUri = data.uri || data.path || data.url || extras['android.intent.extra.STREAM'];

        if (processedFiles.length === 0 && singleUri) {
            const mime = data.mimeType || data.type || "";
            const uriStr = singleUri.toString();
            console.log(`[MobileShare] Single URI detected: ${uriStr}, Mime: ${mime}`);

            const definitelyImage = mime.startsWith('image/') ||
                /\.(jpg|jpeg|png|gif|webp)$/i.test(uriStr) ||
                uriStr.includes('com.google.android.apps.photos.contentprovider');

            if (definitelyImage || mime.startsWith('video/') || uriStr.startsWith('content://')) {
                processedFiles = [{
                    uri: singleUri,
                    mimeType: mime || (definitelyImage ? 'image/jpeg' : 'application/octet-stream'),
                    name: data.name || "Shared Idea"
                }];
                console.log("[MobileShare] Auto-packaged single file share");
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

            // 1. Process as URL or Text if content exists (AND no files are present)
            // If files ARE present, they will be handled in the next section to avoid duplicates
            if ((textContent || finalUrl) && !hasFiles) {
                const itemId = generateId();
                await addItem({
                    id: itemId,
                    user_id: userId,
                    type: isUrl ? 'link' : 'text',
                    content: finalUrl || textContent,
                    status: 'inbox',
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
                        (typeof fileUri === 'string' && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUri)) ||
                        fileUri.toString().startsWith('content://');

                    if (!fileUri) {
                        console.warn("[MobileShare] Skipping file with no URI");
                        continue;
                    }

                    console.log(`[MobileShare] File detected: mime=${mime}, isImage=${isImage}, uri=${fileUri.toString().substring(0, 50)}...`);

                    const finalFileUri = fileUri.toString();
                    let finalFileContent = "";

                    if (isImage) {
                        console.log(`[MobileShare] Processing Image: ${finalFileUri.substring(0, 50)}...`);
                        const uploaded = await uploadMobileFile(finalFileUri, fileId, userId);
                        if (uploaded) {
                            finalFileContent = uploaded;
                            console.log(`[MobileShare] Image Uploaded Successfully: ${uploaded}`);
                        } else {
                            console.error("[MobileShare] Image upload failed - skipping this file to avoid broken cards");
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
                        type: isImage ? 'image' : 'link',
                        content: finalFileContent,
                        status: 'inbox',
                        metadata: {
                            title: file.name || intentTitle || (isImage ? "Idea Capture" : "Shared Idea"),
                            description: textContent || `Shared via mobile`
                        },
                        position_x: 0, position_y: 0,
                        created_at: new Date().toISOString()
                    });
                }
            }

            setShareState('saved');
            setTimeout(() => {
                setActiveTab('inbox');
                setIsOverlayFading(true);
                setTimeout(() => {
                    setShareState('idle');
                    setIsOverlayFading(false);
                }, 500);
            }, 1200);

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
                    .then(data => updateItemContent(id, { metadata: data }));

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
                background: isSharing ? 'transparent' : '#000',
                display: isSharing ? 'none' : 'block'
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

