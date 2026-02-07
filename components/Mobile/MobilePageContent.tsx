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
            const cap = (window as any).Capacitor;
            if (!cap) return;

            try {
                // 1. Handle Sharing Intents
                console.log("[MobileInit] Initializing SendIntent. User:", session?.user?.id);
                const SendIntent = cap.Plugins.SendIntent;
                if (SendIntent) {
                    if (SendIntent.removeAllListeners) { try { await SendIntent.removeAllListeners(); } catch (e) { } }
                    SendIntent.addListener('appSendActionIntent', (data: any) => handleSharedContent(data));
                    if (SendIntent.checkSendIntentReceived) {
                        const result = await SendIntent.checkSendIntentReceived();
                        if (result && (result.value || result.extras)) handleSharedContent(result);
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
            // Capacitor.convertFileSrc is needed to read content:// or file:// URIs in the webview
            const pocketUri = Capacitor.convertFileSrc(uri);
            console.log(`[MobileUpload] Converted URI: ${pocketUri}`);

            const response = await fetch(pocketUri);
            if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

            const blob = await response.blob();
            console.log(`[MobileUpload] Blob created: ${blob.size} bytes, type: ${blob.type}`);

            const extension = blob.type.split('/')[1] || 'jpg';
            const filename = `${userId}/${itemId}_capture.${extension}`;

            const { error } = await supabase.storage
                .from('screenshots')
                .upload(filename, blob, {
                    contentType: blob.type || 'image/jpeg',
                    upsert: true
                });

            if (error) {
                console.error("[MobileUpload] Supabase error:", error);
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('screenshots')
                .getPublicUrl(filename);

            console.log(`[MobileUpload] Success: ${publicUrl}`);
            return publicUrl;
        } catch (err) {
            console.error("[MobileUpload] Critical Failure:", err);
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
        if (processedFiles.length === 0 && (data.uri || data.path || data.url)) {
            const mime = data.mimeType || data.type || "";
            if (mime.startsWith('image/') || mime.startsWith('video/') || (data.path && /\.(jpg|jpeg|png|gif|webp)$/i.test(data.path))) {
                processedFiles = [{
                    uri: data.uri || data.path || data.url,
                    mimeType: mime || 'image/jpeg',
                    name: data.name || "Shared Item"
                }];
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

            // 1. Process as URL or Text if content exists
            if (textContent || finalUrl) {
                const itemId = generateId();
                let localPreviewUrl: string | null = null;

                // Try to find a preview image if it's a link share
                if (isUrl && hasFiles) {
                    const previewFile = processedFiles.find((f: any) => f.mimeType?.startsWith('image/'));
                    if (previewFile) {
                        localPreviewUrl = await uploadMobileFile(previewFile.uri || previewFile.path || previewFile.url, itemId, userId);
                    }
                }

                await addItem({
                    id: itemId,
                    user_id: userId,
                    type: isUrl ? 'link' : 'text',
                    content: finalUrl || textContent,
                    status: 'inbox',
                    metadata: {
                        title: intentTitle || (isUrl ? "Shared Link" : "Shared Text"),
                        description: isUrl ? "Captured from Mobile" : "Shared from Mobile",
                        image: localPreviewUrl || undefined
                    },
                    position_x: 0, position_y: 0,
                    created_at: new Date().toISOString()
                });

                // Auto-screenshot for links if no native preview
                if (isUrl && !localPreviewUrl) {
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
                for (const file of processedFiles) {
                    // Avoid double-processing if it was already used as a preview for a link
                    // (Actually we might want both if the user shared an image AND a link)

                    const fileId = generateId();
                    const isImage = file.mimeType?.startsWith('image/');
                    const fileUri = file.uri || file.path || file.url;

                    if (!fileUri) continue;

                    let finalFileContent = fileUri;
                    if (isImage) {
                        const uploaded = await uploadMobileFile(fileUri, fileId, userId);
                        if (uploaded) finalFileContent = uploaded;
                    }

                    await addItem({
                        id: fileId,
                        user_id: userId,
                        type: isImage ? 'image' : 'link',
                        content: finalFileContent,
                        status: 'inbox',
                        metadata: {
                            title: file.name || (isImage ? "Shared Photo" : "Shared File"),
                            description: `Shared via mobile gallery`
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
        // On mobile, position doesn't matter much as it's a list, but we give it 0,0
        if (type === 'folder') {
            addFolder({
                id, user_id: session?.user?.id || 'unknown', name: value,
                position_x: 0, position_y: 0, status: 'active',
                created_at: new Date().toISOString()
            });
        } else {
            let content = type === 'text' ? '' : value;
            if (type === 'link' && content && !/^https?:\/\//i.test(content)) {
                content = 'https://' + content;
            }
            const title = type === 'text' ? value : 'New Item';

            addItem({
                id, user_id: session?.user?.id || 'unknown', type: (type === 'camera' ? 'image' : type) as any,
                content: content, status: 'active',
                position_x: 0, position_y: 0,
                created_at: new Date().toISOString(),
                metadata: { title }
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

