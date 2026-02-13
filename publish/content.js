// Brainia Extension Detection Script
(function () {
    // Inject a flag so the website knows Brainia is installed
    document.documentElement.setAttribute('data-brainia-installed', 'true');

    // Also send a custom event for dynamic checking
    window.dispatchEvent(new CustomEvent('BrainiaInstalled'));

    console.log("[Brainia] Presence detected by host.");
})();

// --- Toast Notification Logic ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SHOW_BRAINIA_TOAST") {
        showBrainiaToast(request.message, request.type);
    }
});

function showBrainiaToast(message, type = 'success') {
    // Remove existing toast if present
    const existing = document.getElementById('brainia-toast-root');
    if (existing) existing.remove();

    // Create host for shadow DOM
    const host = document.createElement('div');
    host.id = 'brainia-toast-root';
    host.style.position = 'fixed'; // Important to ensure the host itself doesn't mess up layout
    host.style.zIndex = '2147483647'; // Max z-index
    host.style.top = '20px';
    host.style.right = '20px';
    host.style.pointerEvents = 'none'; // Click-through
    // host.style.width = '0'; // REMOVED: Caused toast to overflow to the right (offscreen)
    // host.style.height = '0';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    // Styles
    const style = document.createElement('style');
    style.textContent = `
        .brainia-toast {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(15, 15, 20, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 12px 20px;
            box-shadow: 
                0 4px 20px rgba(0, 0, 0, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.05);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: white;
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            width: max-content;
            pointer-events: none; /* Let clicks pass through if preferred, or auto to block */
            position: relative;
            overflow: hidden;
        }

        .brainia-toast.visible {
            opacity: 1;
            transform: translateY(0) scale(1);
        }

        /* Orb Gradient Background Effect */
        .orb-glow {
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(
                135deg,
                rgba(97, 42, 254, 0.2), 
                rgba(76, 194, 233, 0.2),
                rgba(16, 20, 153, 0.1)
            );
            z-index: -1;
            filter: blur(20px);
            animation: rotate 10s linear infinite;
        }

        @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .icon-container {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            background: ${type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(110, 86, 207, 0.3)'};
            border-radius: 50%;
            color: ${type === 'error' ? '#ef4444' : '#a78bfa'};
        }

        .message {
            font-size: 14px;
            font-weight: 500;
            line-height: 1.4;
            color: #f3f3f3;
        }
    `;

    // Content
    const toast = document.createElement('div');
    toast.className = 'brainia-toast';

    // SVG Icon
    const successIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

    toast.innerHTML = `
        <div class="orb-glow"></div>
        <div class="icon-container">
            ${successIcon}
        </div>
        <span class="message">${message}</span>
    `;

    shadow.appendChild(style);
    shadow.appendChild(toast);

    // Animate In
    requestAnimationFrame(() => {
        toast.classList.add('visible');
    });

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => {
            if (host.parentNode) host.remove();
        }, 400); // Wait for transition
    }, 3000);
}
