// Brainia Extension Detection Script
(function () {
    // Inject a flag so the website knows Brainia is installed
    document.documentElement.setAttribute('data-brainia-installed', 'true');

    // Also send a custom event for dynamic checking
    window.dispatchEvent(new CustomEvent('BrainiaInstalled'));

    console.log("[Brainia] Presence detected by host.");

    // Track last right-clicked element for smart extraction
    let lastRightClickElement = null;
    document.addEventListener('contextmenu', (e) => {
        lastRightClickElement = e.target;
    }, true);

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "SHOW_BRAINIA_TOAST") {
            showBrainiaToast(request.message, request.type);
        }

        if (request.action === "GET_SELECTION_BLOCKS") {
            const blocks = parseSelectionToBlocks();
            sendResponse({ blocks: blocks });
        }

        if (request.action === "GET_CAPTURE_DATA") {
            let imageUrl = null;
            let title = null;
            let description = null;

            // Pinterest specific extraction
            if (window.location.hostname.includes('pinterest')) {
                // Try to find the main pin container or the one under the mouse
                const pinContainer = lastRightClickElement?.closest('[data-test-id="pin"]') ||
                    lastRightClickElement?.closest('[data-test-id="visual-content-container"]') ||
                    document.querySelector('[data-test-id="visual-content-container"]') ||
                    document.querySelector('main');

                let pinImg = null;
                if (pinContainer) {
                    pinImg = pinContainer.querySelector('img');

                    // 1. High-res Image Extraction
                    if (pinImg) {
                        if (pinImg.srcset) {
                            const sources = pinImg.srcset.split(',');
                            imageUrl = sources[sources.length - 1].trim().split(' ')[0];
                        } else {
                            imageUrl = pinImg.src;
                        }
                    }

                    // 2. Title Extraction (Multiple selectors for different layout versions)
                    title = pinContainer.querySelector('[data-test-id="pinTitle"] h1')?.textContent ||
                        pinContainer.querySelector('[data-test-id="pin-title"]')?.textContent ||
                        document.querySelector('[data-test-id="pinTitle"] h1')?.textContent ||
                        document.querySelector('h1')?.textContent ||
                        pinImg?.alt;

                    // 3. Description Extraction
                    description = pinContainer.querySelector('[data-test-id="main-pin-description-text"]')?.textContent ||
                        pinContainer.querySelector('[data-test-id="pin-description"]')?.textContent ||
                        document.querySelector('[data-test-id="main-pin-description-text"]')?.textContent;
                }

                // Final cleanup for Pinterest titles (remove branding)
                if (title) title = title.replace(" - Pinterest", "").trim();
            }

            // Generic fallback
            if (!imageUrl && lastRightClickElement) {
                if (lastRightClickElement.tagName === 'IMG') {
                    imageUrl = lastRightClickElement.src;
                    title = lastRightClickElement.alt;
                } else {
                    const img = lastRightClickElement.querySelector('img');
                    if (img) {
                        imageUrl = img.src;
                        title = img.alt;
                    }
                }
            }

            // Final fallback to page meta
            if (!imageUrl) imageUrl = document.querySelector('meta[property="og:image"]')?.content;
            if (!title) title = document.querySelector('meta[property="og:title"]')?.content || document.title;
            if (!description) description = document.querySelector('meta[property="og:description"]')?.content;

            sendResponse({ imageUrl, title, description });
        }
    });
})();

// --- Toast Notification Logic ---
function parseSelectionToBlocks() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const container = document.createElement("div");
    container.appendChild(range.cloneContents());

    const blocks = [];

    function processInline(node, styles = {}, activeLink = null) {
        let content = [];
        node.childNodes.forEach(child => {
            const currentLink = activeLink || (child.tagName === "A" ? child.href : null);

            if (child.nodeType === Node.TEXT_NODE) {
                if (child.textContent) {
                    content.push({
                        type: "text",
                        text: child.textContent,
                        styles: { ...styles },
                        ...(currentLink ? { href: currentLink } : {})
                    });
                }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const newStyles = { ...styles };
                const tagName = child.tagName.toUpperCase();

                if (tagName === "B" || tagName === "STRONG") newStyles.bold = true;
                if (tagName === "I" || tagName === "EM") newStyles.italic = true;
                if (tagName === "U") newStyles.underline = true;
                if (tagName === "CODE") newStyles.code = true;

                let linkToPass = currentLink;
                if (tagName === "A") {
                    linkToPass = child.href;
                    newStyles.textColor = "blue";
                }

                content = content.concat(processInline(child, newStyles, linkToPass));
            }
        });
        return content;
    }

    // Top-level block detection
    const blockElements = ['P', 'H1', 'H2', 'H3', 'LI', 'DIV', 'BLOCKQUOTE', 'PRE'];

    // If the selection is just one level deep or partial, we might not have clear block elements
    let currentBlockContent = [];

    container.childNodes.forEach(node => {
        const tagName = node.nodeType === Node.ELEMENT_NODE ? node.tagName.toUpperCase() : null;

        if (tagName && blockElements.includes(tagName)) {
            // Flush any pending inline content into a paragraph first
            if (currentBlockContent.length > 0) {
                blocks.push({ type: "paragraph", content: currentBlockContent });
                currentBlockContent = [];
            }

            let type = "paragraph";
            let props = {};
            if (tagName === "H1") { type = "heading"; props = { level: 1 }; }
            else if (tagName === "H2") { type = "heading"; props = { level: 2 }; }
            else if (tagName === "H3") { type = "heading"; props = { level: 3 }; }

            blocks.push({
                type,
                ...(Object.keys(props).length ? { props } : {}),
                content: processInline(node)
            });
        } else {
            // Inline or non-block element
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent) {
                    currentBlockContent.push({
                        type: "text",
                        text: node.textContent,
                        styles: {}
                    });
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                currentBlockContent = currentBlockContent.concat(processInline(node));
            }
        }
    });

    // Final flush
    if (currentBlockContent.length > 0) {
        blocks.push({ type: "paragraph", content: currentBlockContent });
    }

    return blocks.length > 0 ? blocks : null;
}

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
