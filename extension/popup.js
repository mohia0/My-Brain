
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

// --- STATE ---
const state = {
    user: null,
    view: null,
    currentTab: null
};

// --- DOM ELEMENTS ---
const app = document.getElementById('app');
const statusDot = document.getElementById('status-indicator');

const authView = document.getElementById('auth-view');
const mainView = document.getElementById('main-view');
const noteView = document.getElementById('note-view');

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('auth-error');
const loginBtn = document.getElementById('login-btn');


const tabPreview = document.getElementById('tab-preview');
const tabFavicon = document.getElementById('tab-favicon');
const tabTitle = document.getElementById('tab-title');
const tabUrl = document.getElementById('tab-url');

const saveTabBtn = document.getElementById('save-tab-btn');
const addNoteBtn = document.getElementById('add-note-btn');
const logoutBtn = document.getElementById('logout-btn');

const backBtn = document.getElementById('back-btn');
const noteInput = document.getElementById('note-input');
const saveNoteBtn = document.getElementById('save-note-btn');

const toast = document.getElementById('toast');

// --- INIT ---
async function init() {
    // Check Session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        state.user = session.user;
        statusDot.classList.add('connected');
        statusDot.title = "Connected";
        navigate('main');
    } else {
        navigate('auth');
    }

    // Get Tab Info
    if (chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                state.currentTab = tabs[0];
                renderTabInfo();
            }
        });
    } else {
        // Mock for dev
        state.currentTab = { title: "Dev Tab", url: "http://localhost:3000", favIconUrl: "https://via.placeholder.com/32" };
        renderTabInfo();
    }
}

// --- LOGIC ---

function navigate(viewName) {
    state.view = viewName;
    authView.classList.add('hidden');
    mainView.classList.add('hidden');
    noteView.classList.add('hidden');

    if (viewName === 'auth') authView.classList.remove('hidden');
    if (viewName === 'main') mainView.classList.remove('hidden');
    if (viewName === 'note') noteView.classList.remove('hidden');
}

function renderTabInfo() {
    if (!state.currentTab) return;
    tabTitle.textContent = state.currentTab.title;
    try {
        tabUrl.textContent = new URL(state.currentTab.url).hostname;
    } catch (e) {
        tabUrl.textContent = state.currentTab.url;
    }

    if (state.currentTab.favIconUrl) {
        tabFavicon.src = state.currentTab.favIconUrl;
    } else {
        tabFavicon.style.display = 'none';
    }
}

function showToast(msg, type = 'success') {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.style.background = type === 'error' ? 'var(--danger)' : 'var(--success)';
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

// --- ACTIONS ---

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    loginBtn.textContent = "Signing In...";
    loginBtn.disabled = true;
    authError.classList.add('hidden');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    loginBtn.textContent = "Sign In";
    loginBtn.disabled = false;

    if (error) {
        authError.textContent = error.message;
        authError.classList.remove('hidden');
    } else {
        state.user = data.user;
        statusDot.classList.add('connected');
        navigate('main');
    }
});


logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    state.user = null;
    statusDot.classList.remove('connected');
    navigate('auth');
});

saveTabBtn.addEventListener('click', async () => {
    if (!state.user || !state.currentTab) return;

    const btnText = saveTabBtn.querySelector('.btn-text');
    const originalText = btnText.textContent;
    btnText.textContent = "Capturing...";
    saveTabBtn.disabled = true;

    try {
        // 1. Capture Visible Tab
        const dataUrl = await new Promise((resolve, reject) => {
            chrome.tabs.captureVisibleTab({ format: 'jpeg', quality: 60 }, (dataUrl) => {
                if (chrome.runtime.lastError) {
                    // Fallback if capture fails (e.g. settings page)
                    console.warn("Capture failed:", chrome.runtime.lastError);
                    resolve(null);
                } else {
                    resolve(dataUrl);
                }
            });
        });

        let publicUrl = state.currentTab.favIconUrl; // Default to favicon

        if (dataUrl) {
            btnText.textContent = "Uploading...";
            // 2. Upload to Supabase
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const filename = `${state.user.id}/${Date.now()}.jpg`;

            const { data, error: uploadError } = await supabase.storage
                .from('screenshots')
                .upload(filename, blob, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // 3. Get Public URL
            const { data: { publicUrl: url } } = supabase.storage
                .from('screenshots')
                .getPublicUrl(filename);

            publicUrl = url;
        }

        btnText.textContent = "Saving Item...";

        // 4. Save Item
        const { error } = await supabase.from('items').insert({
            id: crypto.randomUUID(),
            user_id: state.user.id,
            type: 'link',
            content: state.currentTab.url,
            metadata: {
                title: state.currentTab.title,
                image: publicUrl,
                description: 'Saved via Extension'
            },
            status: 'inbox',
            position_x: 0,
            position_y: 0
        });

        if (error) throw error;

        showToast("Saved to Inbox!");
    } catch (e) {
        console.error(e);
        if (e.message?.includes('foreign key constraint') || e.code === '23503') {
            await supabase.auth.signOut();
            state.user = null;
            statusDot.classList.remove('connected');
            navigate('auth');
            authError.textContent = "Session invalid. Please login again.";
            authError.classList.remove('hidden');
            return;
        }
        showToast(`Error: ${e.message || e.error_description || "Unknown error"}`, 'error');
    } finally {
        btnText.textContent = originalText;
        saveTabBtn.disabled = false;
    }
});

addNoteBtn.addEventListener('click', () => {
    navigate('note');
    setTimeout(() => noteInput.focus(), 100);
});

backBtn.addEventListener('click', () => {
    navigate('main');
});

saveNoteBtn.addEventListener('click', async () => {
    const text = noteInput.value.trim();
    if (!text) return;

    saveNoteBtn.textContent = "Saving...";
    saveNoteBtn.disabled = true;

    try {
        const { error } = await supabase.from('items').insert({
            id: crypto.randomUUID(),
            user_id: state.user.id,
            type: 'text',
            content: text,
            status: 'inbox',
            position_x: 0,
            position_y: 0
        });

        if (error) throw error;

        showToast("Note Saved!");
        noteInput.value = "";
        setTimeout(() => navigate('main'), 500);
    } catch (e) {
        console.error(e);
        if (e.message?.includes('foreign key constraint') || e.code === '23503') {
            await supabase.auth.signOut();
            state.user = null;
            statusDot.classList.remove('connected');
            navigate('auth');
            authError.textContent = "Session invalid. Please login again.";
            authError.classList.remove('hidden');
            return;
        }
        showToast(`Error: ${e.message || e.error_description || "Unknown error"}`, 'error');
    } finally {
        saveNoteBtn.textContent = "Save Note";
        saveNoteBtn.disabled = false;
    }
});


// Start
init();
