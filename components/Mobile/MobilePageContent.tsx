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

export default function MobilePageContent({ session }: { session: any }) {
    const { addItem, addFolder, clearSelection, updateItemContent } = useItemsStore();
    const [activeTab, setActiveTab] = useState<'home' | 'inbox'>('home');
    const [shareState, setShareState] = useState<'idle' | 'saving' | 'saved' | 'capturing'>('idle');

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
        const initIntent = async () => {
            try {
                if (typeof window !== 'undefined' && (window as any).Capacitor) {
                    const { SendIntent } = await (0, eval)("import('capacitor-plugin-send-intent')");
                    SendIntent.addListener('appSendActionIntent', (data: any) => {
                        handleSharedContent(data);
                    });
                    const result = await SendIntent.checkSendIntentReceived();
                    if (result) handleSharedContent(result);
                }
            } catch (err) {
                console.log("Capacitor SendIntent not available");
            }
        };
        initIntent();
    }, []);

    const handleSharedContent = async (data: any) => {
        let content = data.value || data.text || data.url || "";
        let title = data.title || "Shared Item";
        let fileData = data.files?.[0];

        if (!content && data.extras) {
            content = data.extras['android.intent.extra.TEXT'] || "";
            title = data.extras['android.intent.extra.SUBJECT'] || title;
        }

        if (!content && !fileData) return;

        const isUrl = /^https?:\/\//i.test((content || "").trim());
        setShareState('saving');

        try {
            const itemId = crypto.randomUUID();
            const userId = session?.user?.id || 'unknown';

            if (content) {
                await addItem({
                    id: itemId,
                    user_id: userId,
                    type: isUrl ? 'link' : 'text',
                    content: content,
                    status: 'inbox',
                    metadata: { title, description: "Shared from Android" },
                    position_x: 0, position_y: 0,
                    created_at: new Date().toISOString()
                });

                // If it's a URL, trigger screenshot capture
                if (isUrl) {
                    setShareState('capturing');
                    fetch('/api/screenshot', {
                        method: 'POST',
                        body: JSON.stringify({ url: content, itemId, userId })
                    }).catch(err => console.error("Screenshot failed:", err));
                }
            } else if (fileData) {
                // Handle direct file share (image/video/pdf)
                await addItem({
                    id: itemId,
                    user_id: userId,
                    type: fileData.mimeType?.startsWith('image/') ? 'image' : 'link',
                    content: fileData.path || fileData.uri || "File Content",
                    status: 'inbox',
                    metadata: {
                        title: title === 'Shared Item' ? (fileData.name || "Shared File") : title,
                        description: `Shared ${fileData.mimeType || 'file'}`
                    },
                    position_x: 0, position_y: 0,
                    created_at: new Date().toISOString()
                });
            }
            setShareState('saved');
            setTimeout(() => setShareState('idle'), 2000);
        } catch (e) {
            console.error("Save error:", e);
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

        const id = crypto.randomUUID();
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

    return (
        <div className="mobile-app">
            <MobileHeader onResultClick={handleResultClick} />

            <div style={{ paddingBottom: '128px' }}>
                {activeTab === 'home' ? (
                    <MobileHome
                        onItemClick={setSelectedItemId}
                        onFolderClick={setSelectedFolderId}
                    />
                ) : (
                    <MobileInbox onItemClick={setSelectedItemId} />
                )}
            </div>

            <MobileAddButton onAdd={handleAddClick} />

            <MobileNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {shareState !== 'idle' && <ShareProcessingOverlay status={shareState} />}

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
                    background: #000;
                }
            `}</style>
        </div>
    );
}
