
import { createClient } from '@supabase/supabase-js';

// --- CONFIG ---
const SUPABASE_URL = 'https://mopfyefzzdtohfxczdke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vcGZ5ZWZ6emR0b2hmeGN6ZGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTc0MTgsImV4cCI6MjA4NTczMzQxOH0.hmcr4bB-68YEaS2-jXj1mPA0MNs_7dtSbWM2M0311BU';

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

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "capture-text",
        title: "Capture to Brainia",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "capture-text" && info.selectionText) {
        console.log("[Background] Capturing selection:", info.selectionText);

        try {
            // Check if user is logged in
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                console.error("[Background] No session found. User must be logged in via the popup.");
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'Icon.png',
                    title: 'Not Logged In',
                    message: 'Please log in to the Brainia extension to capture text.',
                    priority: 2
                });
                return;
            }

            const user = session.user;
            const text = info.selectionText.trim();
            const title = text.length > 50 ? text.substring(0, 50) + '...' : text;

            // Create item in Supabase
            const { error } = await supabase.from('items').insert({
                id: crypto.randomUUID(),
                user_id: user.id,
                type: 'text',
                content: text,
                metadata: {
                    title: title
                },
                status: 'inbox',
                position_x: 0,
                position_y: 0
            });

            if (error) throw error;

            console.log("[Background] Successfully captured note to inbox.");

            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'Icon.png',
                title: 'Captured to Brainia',
                message: 'Text saved to your inbox.',
                priority: 2
            });

        } catch (err) {
            console.error("[Background] Error capturing text:", err);
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
