
import { createClient } from '@supabase/supabase-js';

// --- CONFIG ---
const SUPABASE_URL = 'https://mopfyefzzdtohfxczdke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vcGZ5ZWZ6emR0b2hmeGN6ZGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTc0MTgsImV4cCI6MjA4NTczMzQxOH0.hmcr4bB-68YEaS2-jXj1mPA0MNs_7dtSbWM2M0311BU';

// --- UTILS ---

async function notifyTab(tabId, message, type = 'success') {
    try {
        const response = await chrome.tabs.sendMessage(tabId, {
            action: "SHOW_BRAINIA_TOAST",
            type,
            message
        }).catch(() => null);

        if (response && response.status === 'ok') return;

        // If not sent, inject and try again
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        });

        // Small delay to ensure script is ready
        setTimeout(() => {
            chrome.tabs.sendMessage(tabId, {
                action: "SHOW_BRAINIA_TOAST",
                type,
                message
            }).catch(e => console.error("[Background] Toast message failed after injection:", e));
        }, 150);

    } catch (err) {
        console.error("[Background] Failed to notify tab:", err);
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'Icon.png',
            title: type === 'success' ? 'Saved!' : 'Notice',
            message: message,
            priority: 2
        });
    }
}

// --- STORAGE ADAPTER ---
const chromeStorageAdapter = {
    getItem: (key) => {
        return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
                resolve(result[key]);
            });
        });
    },
    setItem: (key, value) => {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [key]: value }, () => {
                resolve();
            });
        });
    },
    removeItem: (key) => {
        return new Promise((resolve) => {
            chrome.storage.local.remove([key], () => {
                resolve();
            });
        });
    },
};

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        storage: chromeStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// --- CONTEXT MENU ---

function createMenus() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "save-to-brainia",
            title: "→ Save to Brainia",
            contexts: ["selection", "image", "link", "page", "action", "editable"]
        });
    });
}

chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onStartup.addListener(createMenus);

// Also call it directly to be sure
createMenus();

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "save-to-brainia") {
        try {
            // Check if user is logged in
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'Icon.png',
                    title: 'Not Logged In',
                    message: 'Please log in to the Brainia extension to capture items.',
                    priority: 2
                });
                return;
            }

            const user = session.user;

            // Initialize capture data
            let captureData = {
                imageUrl: info.srcUrl,
                videoUrl: null,
                title: null,
                description: null
            };

            // Smart extraction for Pinterest and others
            if (tab?.id) {
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });

                    const response = await new Promise((resolve) => {
                        chrome.tabs.sendMessage(tab.id, { action: "GET_CAPTURE_DATA" }, (res) => {
                            if (chrome.runtime.lastError) resolve(null);
                            else resolve(res);
                        });
                    });

                    if (response) {
                        captureData = { ...captureData, ...response };
                    }
                } catch (e) {
                    console.warn("[Background] Smart extraction failed:", e);
                }
            }

            // HANDLE IMAGE/VIDEO/LINK CAPTURE (SMART MODE)
            // If we have an image URL or Video URL, we treat it as a rich link
            if (captureData.imageUrl || captureData.videoUrl || info.mediaType === 'image') {
                const imgUrl = captureData.imageUrl || info.srcUrl;
                // Use captured post URL if available (e.g. specific tweet/post), otherwise fallback to tab URL
                const sourceUrl = captureData.postUrl || tab?.url || info.pageUrl;
                const isVideo = !!captureData.videoUrl;

                const { error } = await supabase.from('items').insert({
                    id: crypto.randomUUID(),
                    user_id: user.id,
                    type: isVideo ? 'video' : 'link', // Use video type if we found one
                    content: isVideo ? captureData.videoUrl : (sourceUrl || imgUrl), // Content for video is the source
                    metadata: {
                        title: captureData.title || tab?.title || (isVideo ? "Captured Video" : "Captured Image"),
                        description: captureData.description || "",
                        image: imgUrl, // Preview image
                        url: sourceUrl, // This links back to the post
                        isVideo: isVideo,
                        source: "Extension Smart Capture"
                    },
                    status: 'inbox',
                    position_x: 0,
                    position_y: 0
                });

                if (error) throw error;
                if (tab?.id) notifyTab(tab.id, 'Image saved to Brainia');
                return;
            }

            // HANDLE TEXT SELECTION (Fallback or intentional)
            if (info.selectionText) {
                console.log("[Background] Capturing selection:", info.selectionText);
                let blocks = null;

                // 1. Try to get semantic blocks from content script
                if (tab?.id) {
                    try {
                        const response = await new Promise((resolve) => {
                            chrome.tabs.sendMessage(tab.id, { action: "GET_SELECTION_BLOCKS" }, (res) => {
                                if (chrome.runtime.lastError) resolve(null);
                                else resolve(res);
                            });
                        });

                        if (response && response.blocks) {
                            blocks = response.blocks;
                        }
                    } catch (e) {
                        console.warn("[Background] Failed to get semantic blocks:", e);
                    }
                }

                if (!blocks) {
                    blocks = [{
                        type: "paragraph",
                        content: [{ type: "text", text: info.selectionText, styles: {} }]
                    }];
                }

                let title = "";
                const firstHeading = blocks.find(b => b.type === "heading");
                if (firstHeading && firstHeading.content && firstHeading.content.length > 0) {
                    title = firstHeading.content.map(c => c.text).join('').trim();
                    if (title.length > 50) title = title.substring(0, 50) + "...";
                }

                if (!title) {
                    const words = info.selectionText.trim().split(/\s+/);
                    title = words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
                }

                const { error } = await supabase.from('items').insert({
                    id: crypto.randomUUID(),
                    user_id: user.id,
                    type: 'text',
                    content: JSON.stringify(blocks),
                    metadata: {
                        title: title,
                        url: tab?.url
                    },
                    status: 'inbox',
                    position_x: 0,
                    position_y: 0
                });

                if (error) throw error;
                if (tab?.id) notifyTab(tab.id, 'Text selection saved');
                return;
            }

            // HANDLE LINK OR PAGE CAPTURE (Fallback if no image or text)
            if (info.linkUrl || info.menuItemId === "save-to-brainia") {
                const targetUrl = info.linkUrl || info.pageUrl || tab?.url;
                if (!targetUrl) throw new Error("Could not determine URL to save.");

                const { error } = await supabase.from('items').insert({
                    id: crypto.randomUUID(),
                    user_id: user.id,
                    type: 'link',
                    content: targetUrl,
                    metadata: {
                        title: captureData.title || tab?.title || "New Link",
                        description: captureData.description || "",
                        url: targetUrl,
                        source: "Extension Context Menu"
                    },
                    status: 'inbox',
                    position_x: 0,
                    position_y: 0
                });

                if (error) throw error;
                if (tab?.id) notifyTab(tab.id, 'Link saved to Brainia');
                return;
            }

            // HANDLE TEXT SELECTION (Fallback or intentional)
            if (info.selectionText) {
                // ... logic remains same but uses notifyTab with message
                // (Already handled by Link/Page above if no selection is detected first)
            }

        } catch (err) {
            console.error("[Background] Error capturing item:", err);
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'Icon.png',
                title: 'Capture Failed',
                message: err.message || 'An unknown error occurred.',
                priority: 2
            });
        }
    }
});
