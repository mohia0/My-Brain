"use client";

import React, { useEffect, useState } from 'react';
import MobileInbox from './MobileInbox';
import ShareProcessingOverlay from './ShareProcessingOverlay';
// Capacitor plugin imported dynamically to avoid build errors on web/SSR
// import { SendIntent } from 'capacitor-plugin-send-intent';
import { useItemsStore } from '@/lib/store/itemsStore';

export default function MobilePageContent() {
    const [shareState, setShareState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const { addItem } = useItemsStore();

    useEffect(() => {
        // Register Listener
        const initIntent = async () => {
            try {
                // @ts-ignore - dynamic import to avoid build time crashes
                const { SendIntent } = await import('capacitor-plugin-send-intent');

                const listener = SendIntent.addListener('appSendActionIntent', (data: any) => {
                    console.log("Intent Received:", data);
                    handleSharedContent(data);
                });

                // @ts-ignore
                const result = await SendIntent.checkSendIntentReceived();
                if (result) {
                    console.log("Initial Intent:", result);
                    handleSharedContent(result);
                }

                return () => {
                    listener.then((handle: any) => handle.remove());
                };
            } catch (err) {
                console.log("Capacitor SendIntent not available:", err);
            }
        };

        const cleanupPromise = initIntent();
        return () => {
            cleanupPromise.then(cleanup => cleanup?.());
        };
    }, []);

    const handleSharedContent = async (data: any) => {
        let content = data.value || data.text || data.url || "";
        let title = data.title || "Shared Item";

        if (!content && data.extras) {
            content = data.extras['android.intent.extra.TEXT'] || "";
            title = data.extras['android.intent.extra.SUBJECT'] || title;
        }

        if (!content && !data.files) return;

        setShareState('saving');

        try {
            if (content) {
                await addItem({
                    id: crypto.randomUUID(),
                    user_id: 'unknown', // Validated in store or ignored if not used
                    type: 'link',
                    content: content,
                    status: 'inbox',
                    metadata: {
                        title: title,
                        description: "Shared from Android"
                    },
                    position_x: 0,
                    position_y: 0,
                    created_at: new Date().toISOString()
                });
            }
            // Note: 'addItem' in store handles user_id injection if authenticated.

            setShareState('saved');
            setTimeout(() => setShareState('idle'), 2000);
        } catch (e) {
            console.error("Save error:", e);
            setShareState('idle');
        }
    };

    return (
        <main>
            {shareState !== 'idle' && <ShareProcessingOverlay status={shareState} />}
            <MobileInbox />
        </main>
    );
}
