
import { createClient } from '@supabase/supabase-js';

// --- CONFIG ---
const SUPABASE_URL = 'https://mopfyefzzdtohfxczdke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vcGZ5ZWZ6emR0b2hmeGN6ZGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTc0MTgsImV4cCI6MjA4NTczMzQxOH0.hmcr4bB-68YEaS2-jXj1mPA0MNs_7dtSbWM2M0311BU';

// --- UTILS ---

async function notifyTab(tabId) {
    try {
        // Always inject the content script first
        // This creates the "user gesture" or "activeTab" context needed
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        });

        // Small delay to ensure script is ready
        setTimeout(() => {
            chrome.tabs.sendMessage(tabId, {
                action: "SHOW_BRAINIA_TOAST",
                type: 'success',
                message: 'Text saved to your second brain'
            }).catch(e => console.error("[Background] Toast message failed:", e));
        }, 100);

    } catch (err) {
        console.error("[Background] Failed to inject toast script:", err);
        // Fallback to native notification if injection fails
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'Icon.png',
            title: 'Saved!',
            message: 'Text saved to your second brain',
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
            title: ". Save to Brainia",
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

            // HANDLE IMAGE/LINK CAPTURE (SMART MODE)
            // If we have an image URL, we treat it as a rich link or an image
            if (captureData.imageUrl || info.mediaType === 'image') {
                const imgUrl = captureData.imageUrl || info.srcUrl;

                // If we have a title or it's Pinterest, save as a 'link' item to preserve context
                // This makes it a "Smart Capture" with image + data
                const isRichCapture = !!(captureData.title || captureData.description || window.location.hostname.includes('pinterest'));

                const { error } = await supabase.from('items').insert({
                    id: crypto.randomUUID(),
                    user_id: user.id,
                    type: isRichCapture ? 'link' : 'image',
                    content: isRichCapture ? (tab?.url || imgUrl) : imgUrl,
                    metadata: {
                        title: captureData.title || tab?.title || "Captured Image",
                        description: captureData.description || "",
                        image: imgUrl, // This acts as the preview image for the link
                        url: tab?.url,
                        source: "Extension Smart Capture"
                    },
                    status: 'inbox',
                    position_x: 0,
                    position_y: 0
                });

                if (error) throw error;
                if (tab?.id) notifyTab(tab.id);
                return;
            }

            // HANDLE TEXT SELECTION (Fallback or intentional)
            if (info.selectionText) {
                console.log("[Background] Capturing selection:", info.selectionText);
                let blocks = null;

                // 1. Try to get semantic blocks from content script
                if (tab?.id) {
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            files: ['content.js']
                        });

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
                if (tab?.id) notifyTab(tab.id);
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
