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
        type: 'text' | 'link' | 'image' | 'folder' | null;
        placeholder: string;
        title: string;
        mode: 'text' | 'file';
    }>({ isOpen: false, type: null, placeholder: '', title: '', mode: 'text' });

    useEffect(() => {
        // Register Intent Listener
        console.log("MobileContent mounted, initializing SendIntent...");

        const initIntent = async () => {
            const cap = (window as any).Capacitor;
            if (!cap) {
                console.log("Capacitor not detected (likely web mode)");
                return;
            }

            try {
                // 1. Handle Sharing Intents
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
                    AppPlugin.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
                        console.log("Back button pressed. canGoBack:", canGoBack);

                        // Priority: Close Input Modal -> Folder Modal -> Item Modal
                        if (inputModalConfig.isOpen) {
                            setInputModalConfig(prev => ({ ...prev, isOpen: false }));
                        } else if (selectedFolderId) {
                            setSelectedFolderId(null);
                        } else if (selectedItemId) {
                            setSelectedItemId(null);
                        } else {
                            // If nothing is open, we can exit or go back in history
                            if (!canGoBack) {
                                AppPlugin.exitApp();
                            } else {
                                window.history.back();
                            }
                        }
                    });
                }
            } catch (err) {
                console.error("Capacitor Plugin registration failed:", err);
            }
        };

        const timer = setTimeout(initIntent, 300);
        return () => {
            clearTimeout(timer);
            // Cleanup App listeners if possible
            const cap = (window as any).Capacitor;
            if (cap?.Plugins?.App?.removeAllListeners) {
                cap.Plugins.App.removeAllListeners();
            }
        };

    }, []);

    const uploadMobileFile = async (uri: string, itemId: string, userId: string): Promise<string | null> => {
        try {
            // Capacitor.convertFileSrc is needed to read content:// or file:// URIs in the webview
            const response = await fetch(Capacitor.convertFileSrc(uri));
            const blob = await response.blob();
            const filename = `${userId}/${itemId}_capture.jpg`;

            const { error } = await supabase.storage
                .from('screenshots')
                .upload(filename, blob, {
                    contentType: blob.type || 'image/jpeg',
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('screenshots')
                .getPublicUrl(filename);

            return publicUrl;
        } catch (err) {
            console.error("[MobileUpload] Failed:", err);
            return null;
        }
    };

    const handleSharedContent = async (data: any) => {
        if (!data) return;
        console.log("Processing shared content RAW:", JSON.stringify(data));

        const extras = data.extras || {};
        const title = data.title || data.subject || extras['android.intent.extra.SUBJECT'] || "Shared Item";

        // Robust text extraction: check extras, value, text, and url
        const textContent = extras['android.intent.extra.TEXT'] ||
            extras['android.intent.extra.PROCESS_TEXT'] ||
            data.value ||
            data.text ||
            data.url ||
            "";

        console.log("Extracted share info:", { title, textContent, filesCount: data.files?.length });

        if (!textContent && (!data.files || data.files.length === 0)) {
            console.warn("No shareable content found in data object");
            return;
        }

        const urlRegex = /(https?:\/\/[^\s]+)/i;
        let finalContent = data.url || null;
        let isUrl = !!data.url;

        if (!finalContent) {
            const urlMatch = textContent.match(urlRegex);
            finalContent = urlMatch ? urlMatch[0] : (textContent || null);
            isUrl = !!urlMatch;
        }

        console.log("Final share content strategy:", { finalContent, isUrl });

        if (!finalContent && (!data.files || data.files.length === 0)) {
            console.warn("No shareable content or files found");
            return;
        }

        setShareState('saving');
        setIsOverlayFading(false);

        try {

            const itemId = generateId();
            const userId = session?.user?.id || 'unknown';

            // Check if we have a local image preview shared with the URL (common on Android)
            let localPreviewUrl: string | null = null;
            if (isUrl && data.files && data.files.length > 0) {
                const previewFile = data.files.find((f: any) => f.mimeType?.startsWith('image/'));
                if (previewFile) {
                    console.log("Found native preview image, uploading...");
                    localPreviewUrl = await uploadMobileFile(previewFile.uri || previewFile.path, itemId, userId);
                }
            }

            if (finalContent) {
                await addItem({
                    id: itemId,
                    user_id: userId,
                    type: isUrl ? 'link' : 'text',
                    content: finalContent,
                    status: 'inbox',
                    metadata: {
                        title: title === "Shared Item" && isUrl ? (textContent.split('\n')[0].substring(0, 50) || "Shared Link") : title,
                        description: isUrl ? "Captured from Mobile" : "Shared Text",
                        image: localPreviewUrl || undefined
                    },
                    position_x: 0, position_y: 0,
                    created_at: new Date().toISOString()
                });

                // Only call the external guest-screenshot API if we didn't get a native one
                if (isUrl && !localPreviewUrl) {
                    setShareState('capturing');

                    // On mobile (Capacitor), relative URLs might fail. 
                    // We attempt to use the location's origin to build an absolute URL.
                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                    const apiUrl = baseUrl.includes('localhost') ? '/api/screenshot' : `${baseUrl}/api/screenshot`;

                    console.log(`[Screenshot] Initiating capture for ${finalContent} (API: ${apiUrl})`);

                    fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            url: finalContent,
                            itemId,
                            userId: session?.user?.id || userId
                        })
                    }).then(res => {
                        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
                        return res.json();
                    }).then(result => {
                        console.log("[Screenshot] API Success:", result);
                    }).catch(err => {
                        console.error("[Screenshot] API call failed definitely:", err);
                    });
                }
            }


            // Handle additional files as separate items if they weren't used as a preview
            if (data.files && data.files.length > 0) {
                for (const file of data.files) {
                    // Skip if this was the preview we already used
                    if (isUrl && (file.uri || file.path) && localPreviewUrl) continue;

                    const fileId = generateId();
                    const isImage = file.mimeType?.startsWith('image/');
                    let persistentUrl = file.uri || file.path;

                    if (isImage) {
                        persistentUrl = await uploadMobileFile(file.uri || file.path, fileId, userId) || persistentUrl;
                    }

                    await addItem({
                        id: fileId,
                        user_id: userId,
                        type: isImage ? 'image' : 'link',
                        content: persistentUrl || "File Content",
                        status: 'inbox',
                        metadata: {
                            title: title === 'Shared Item' ? (file.name || "Shared File") : title,
                            description: `Shared ${file.mimeType || 'file'}`
                        },
                        position_x: 0, position_y: 0,
                        created_at: new Date().toISOString()
                    });
                }
            } else if (!finalContent && data.value) {
                await addItem({
                    id: generateId(),
                    user_id: userId,
                    type: 'text',
                    content: data.value,
                    status: 'inbox',
                    metadata: { title: "Shared Data" },
                    position_x: 0, position_y: 0,
                    created_at: new Date().toISOString()
                });
            }

            setShareState('saved');
            setTimeout(() => {
                setActiveTab('inbox');
                setIsOverlayFading(true);
                setTimeout(() => {
                    setShareState('idle');
                    setIsOverlayFading(false);
                }, 500);
            }, 1000);

        } catch (error) {
            console.error("Sharing processing failed:", error);
            setShareState('idle');
        }
    };

    const handleAddClick = (type: 'text' | 'link' | 'image' | 'folder') => {
        setInputModalConfig({
            isOpen: true,
            type,
            title: type === 'folder' ? 'Create Folder' : `Add ${type === 'image' ? 'Image' : type === 'link' ? 'Link URL' : 'Note'}`,
            placeholder: type === 'folder' ? 'Folder Name' : type === 'text' ? 'Note Title' : 'example.com',
            mode: type === 'image' ? 'file' : 'text'
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
                id, user_id: session?.user?.id || 'unknown', type: type as any,
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

