
// Force sync
import { createClient } from '@supabase/supabase-js';
import { Renderer, Program, Mesh, Triangle, Vec3 } from 'ogl';

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
        // Updated
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
const signupLinkBtn = document.getElementById('signup-link-btn');


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

// --- TAB DETECTION ---
async function updateTabInfo() {
    console.log("[Extension] Updating tab info...");
    if (typeof chrome !== 'undefined' && chrome.tabs) {
        // Use lastFocusedWindow to be more reliable in popups
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]) {
                console.log("[Extension] Tab found:", tabs[0].title);
                state.currentTab = tabs[0];
                renderTabInfo();
            }
        });
    } else {
        console.log("[Extension] No chrome.tabs API found, using mock.");
        state.currentTab = {
            title: "Dev Tab",
            url: "http://localhost:3000",
            favIconUrl: "https://www.google.com/s2/favicons?domain=localhost"
        };
        renderTabInfo();
    }
}

// Listen for tab changes while popup is open
if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.onActivated.addListener(() => {
        console.log("[Extension] onActivated triggered");
        updateTabInfo();
    });
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (tab.active) {
            console.log("[Extension] onUpdated triggered for active tab", changeInfo.status);
            updateTabInfo();
        }
    });
}

// --- INIT ---
async function init() {
    console.log("[Extension] Initializing...");
    updateTabInfo(); // Initial fetch

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
}

// --- LOGIC ---

function navigate(viewName) {
    state.view = viewName;
    authView.classList.add('hidden');
    mainView.classList.add('hidden');
    noteView.classList.add('hidden');

    if (viewName === 'auth') {
        authView.classList.remove('hidden');
        saveTabBtn.disabled = true;
        addNoteBtn.disabled = true;
    }
    if (viewName === 'main') {
        mainView.classList.remove('hidden');
        saveTabBtn.disabled = false;
        addNoteBtn.disabled = false;
        updateTabInfo(); // Refresh on navigation to main
    }
    if (viewName === 'note') {
        noteView.classList.remove('hidden');
    }
}

function renderTabInfo() {
    if (!state.currentTab) return;
    console.log("[Extension] Rendering tab info:", state.currentTab.title);

    tabTitle.textContent = state.currentTab.title;
    try {
        tabUrl.textContent = new URL(state.currentTab.url).hostname;
    } catch (e) {
        tabUrl.textContent = state.currentTab.url;
    }

    if (state.currentTab.favIconUrl) {
        tabFavicon.src = state.currentTab.favIconUrl;
        tabFavicon.style.display = 'block';
    } else {
        tabFavicon.style.display = 'none';
    }
}

function showToast(msg, type = 'success') {
    console.log(`[Toast] ${type}: ${msg}`);
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.style.background = type === 'error' ? 'var(--danger)' : 'var(--success)';
    setTimeout(() => toast.classList.add('hidden'), 3500); // Longer for errors
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

signupLinkBtn.addEventListener('click', () => {
    // Open the app's signup page specifically
    chrome.tabs.create({ url: 'http://localhost:3000?signup=true' });
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
            try {
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

                if (uploadError) {
                    console.warn("Upload failed, falling back to favicon:", uploadError);
                } else {
                    // 3. Get Public URL
                    const { data: { publicUrl: url } } = supabase.storage
                        .from('screenshots')
                        .getPublicUrl(filename);
                    publicUrl = url;
                }
            } catch (uploadErr) {
                console.warn("Upload error, falling back to favicon:", uploadErr);
            }
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


// --- BACKGROUND ORB ---

function initOrb(selector, options = {}) {
    console.log(`[Extension] Initializing orb in ${selector}...`);
    const container = document.querySelector(selector);
    if (!container) return;

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: true });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);

    const vert = /* glsl */ `
        precision highp float;
        attribute vec2 position;
        attribute vec2 uv;
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    const frag = /* glsl */ `
        precision highp float;
        uniform float iTime;
        uniform vec3 iResolution;
        uniform float hover;
        varying vec2 vUv;

        vec3 rgb2yiq(vec3 c) {
            float y = dot(c, vec3(0.299, 0.587, 0.114));
            float i = dot(c, vec3(0.596, -0.274, -0.322));
            float q = dot(c, vec3(0.211, -0.523, 0.312));
            return vec3(y, i, q);
        }
        vec3 yiq2rgb(vec3 c) {
            float r = c.x + 0.956 * c.y + 0.621 * c.z;
            float g = c.x - 0.272 * c.y - 0.647 * c.z;
            float b = c.x - 1.106 * c.y + 1.703 * c.z;
            return vec3(r, g, b);
        }
        vec3 adjustHue(vec3 color, float hueDeg) {
            float hueRad = hueDeg * 3.14159265 / 180.0;
            vec3 yiq = rgb2yiq(color);
            float cosA = cos(hueRad); float sinA = sin(hueRad);
            float i = yiq.y * cosA - yiq.z * sinA;
            float q = yiq.y * sinA + yiq.z * cosA;
            yiq.y = i; yiq.z = q;
            return yiq2rgb(yiq);
        }
        vec3 hash33(vec3 p3) {
            p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
            p3 += dot(p3, p3.yxz + 19.19);
            return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
        }
        float snoise3(vec3 p) {
            const float K1 = 0.333333333; const float K2 = 0.166666667;
            vec3 i = floor(p + (p.x + p.y + p.z) * K1);
            vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
            vec3 e = step(vec3(0.0), d0 - d0.yzx);
            vec3 i1 = e * (1.0 - e.zxy); vec3 i2 = 1.0 - e.zxy * (1.0 - e);
            vec3 d1 = d0 - (i1 - K2); vec3 d2 = d0 - (i2 - K1); vec3 d3 = d0 - 0.5;
            vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
            vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));
            return dot(vec4(31.316), n);
        }

        const vec3 baseColor1 = vec3(0.6117, 0.2627, 0.9960);
        const vec3 baseColor2 = vec3(0.2980, 0.7607, 0.9137);
        const vec3 baseColor3 = vec3(0.0627, 0.0784, 0.6000);

        void main() {
            vec2 uv = (vUv * 2.0 - 1.0) * (iResolution.x / iResolution.y);
            float hue = 280.0;
            vec3 color1 = adjustHue(baseColor1, hue);
            vec3 color2 = adjustHue(baseColor2, hue);
            vec3 color3 = adjustHue(baseColor3, hue);

            float n = snoise3(vec3(uv * 0.6, iTime * 0.2)) * 0.5 + 0.5;
            float len = length(uv);
            float mask = smoothstep(1.1, 0.4, len);
            
            vec3 col = mix(color1, color2, sin(iTime * 0.5) * 0.5 + 0.5);
            col = mix(color3, col, n);
            
            float alpha = options_mask ? mask * 0.5 : mask;
            gl_FragColor = vec4(col * mask, alpha);
        }
    `.replace('options_mask', options.isBackground ? 'true' : 'false');

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
        vertex: vert,
        fragment: frag,
        uniforms: {
            iTime: { value: 0 },
            iResolution: { value: new Vec3(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height) },
        },
        transparent: true
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
        const dpr = 1;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width === 0 || height === 0) return;
        renderer.setSize(width * dpr, height * dpr);
        program.uniforms.iResolution.value.set(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    // Small delay to ensure container is ready
    setTimeout(resize, 50);

    function update(t) {
        requestAnimationFrame(update);
        program.uniforms.iTime.value = t * 0.001;
        renderer.render({ scene: mesh });
    }
    requestAnimationFrame(update);
}

// Start
init();
initOrb('#orb-bg', { isBackground: true });
initOrb('.logo-orb-wrapper', { isBackground: false });
