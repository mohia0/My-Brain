// Brainia Extension Detection Script
(function () {
    if (window.__brainia_injected) return;
    window.__brainia_injected = true;

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
            sendResponse({ status: 'ok' });
            return;
        }

        if (request.action === "GET_SELECTION_BLOCKS") {
            const blocks = parseSelectionToBlocks();
            sendResponse({ blocks: blocks });
        }

        if (request.action === "GET_CAPTURE_DATA") {
            let imageUrl = null;
            let title = null;
            let description = null;
            let videoUrl = null;
            let postUrl = null;

            const extractJsonLd = () => {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const script of scripts) {
                    try {
                        const data = JSON.parse(script.textContent);
                        if (data && (data['@type'] === 'VideoObject' || data['@type'] === 'ImageObject' || data['@type'] === 'Article')) {
                            return data;
                        }
                        // Handle array of objects
                        if (Array.isArray(data)) {
                            const item = data.find(d => d['@type'] === 'VideoObject' || d['@type'] === 'ImageObject' || d['@type'] === 'Article');
                            if (item) return item;
                        }
                    } catch (e) { }
                }
                return null;
            };

            // 1. JSON-LD Extraction (High Priority for Schema-rich sites like TikTok, Insta)
            const jsonLd = extractJsonLd();
            if (jsonLd) {
                title = jsonLd.name || jsonLd.headline || jsonLd.description;
                description = jsonLd.description;
                imageUrl = jsonLd.thumbnailUrl || jsonLd.image;
                if (Array.isArray(imageUrl)) imageUrl = imageUrl[0];
                if (typeof imageUrl === 'object') imageUrl = imageUrl.url;
                videoUrl = jsonLd.contentUrl || jsonLd.embedUrl;
                postUrl = jsonLd.url || jsonLd.mainEntityOfPage;
            }

            // 2. Specific Platform Hooks
            const hostname = window.location.hostname;
            const target = lastRightClickElement; // The element the user actually clicked

            // --- INSTAGRAM ---
            if (hostname.includes('instagram.com')) {
                // Try to find the specific post container. If clicked on modal, 'article' might be higher up.
                const article = target?.closest('article') || document.querySelector('article._aatb') || document.querySelector('article');

                if (article) {
                    // Image: Instagram often puts the real image in a srcset, but sometimes its buried.
                    // We look for the first significant image that isn't a tiny profile pic.
                    const images = Array.from(article.querySelectorAll('img'));
                    // Filter for likely content images (larger than 100px)
                    const contentImg = images.find(img => img.width > 200 || (img.srcset && img.sizes));

                    // Video
                    const video = article.querySelector('video');

                    if (video) {
                        imageUrl = video.poster;
                        // Note: capturing actual video URL is hard due to blobs, but poster is good.
                        // sometimes we can get lucky.
                        if (video.src && !video.src.startsWith('blob:') && video.src.startsWith('http')) videoUrl = video.src;
                    }

                    if (!imageUrl && contentImg) {
                        // Get highest res from srcset if available
                        if (contentImg.srcset) {
                            const sources = contentImg.srcset.split(',');
                            // Last one is usually highest res
                            const lastSource = sources[sources.length - 1].trim();
                            imageUrl = lastSource.split(' ')[0];
                        } else {
                            imageUrl = contentImg.src;
                        }
                    }

                    // Description / Caption
                    const captionEl = article.querySelector('h1') || article.querySelector('span._aacl') || article.querySelector('div[data-testid="post-comment-root"] span');
                    if (captionEl) description = captionEl.textContent;

                    // Post URL (Permalink) - often a time element or an 'a' tag wrapping the time.
                    // New selector strategy: Look for links with /p/ or /reel/
                    const permalink = article.querySelector('a[href^="/p/"], a[href^="/reel/"]');
                    if (permalink) postUrl = permalink.href;
                }

                if (!title) title = "Instagram Post";
            }

            // --- FACEBOOK ---
            else if (hostname.includes('facebook.com')) {
                // FB is complex due to randomized classes.
                const post = target?.closest('[role="article"]') || document.querySelector('[role="article"]');

                if (post) {
                    // Image: FB uses specific image classes often inside a masked link
                    const imgs = Array.from(post.querySelectorAll('img'));
                    // Filter out small icons/emojis (FB often uses 16x16 or 24x24 icons)
                    const contentImg = imgs.find(img => (img.width > 200 || img.height > 200) && img.src.includes('fbcdn'));

                    if (contentImg) imageUrl = contentImg.src;

                    // Text content
                    const textContainer = post.querySelector('[data-ad-preview="message"]') || post.querySelector('div[dir="auto"]');
                    if (textContainer) description = textContainer.textContent;

                    // Author / Title
                    const author = post.querySelector('h3') || post.querySelector('h2') || post.querySelector('strong');
                    if (author) title = "Post by " + author.textContent;

                    // Post URL
                    // Look for links that contain /posts/, /photo.php, /permalink.php, or /watch within the post container
                    const dateLink = Array.from(post.querySelectorAll('a')).find(a =>
                        a.href.includes('/posts/') ||
                        a.href.includes('/photo.php') ||
                        a.href.includes('/permalink.php') ||
                        a.href.includes('/watch') ||
                        (a.innerText && /\d+/.test(a.innerText)) // timestamp link often has numbers/time
                    );
                    if (dateLink) postUrl = dateLink.href;
                }

                // Fallback: Check if user right-clicked a specific image even if outside typical article structure (e.g. theater mode)
                if (!imageUrl && target && target.tagName === 'IMG' && target.src.includes('fbcdn')) {
                    imageUrl = target.src;
                }

                // Fallback for full page (e.g. photo view)
                if (!imageUrl) {
                    const spotlight = document.querySelector('img[data-visualcompletion="media-vc-image"]');
                    if (spotlight) imageUrl = spotlight.src;
                    // If likely in theater mode, current URL is the post URL
                    if (window.location.href.includes('/photo') || window.location.href.includes('/posts/')) {
                        postUrl = window.location.href;
                    }
                }

                if (!title) title = "Facebook Post";
            }

            // --- TIKTOK ---
            else if (hostname.includes('tiktok.com')) {
                // TikTok usually has good JSON-LD, but if that fails:
                const videoContainer = target?.closest('[data-e2e="tiktok-video"]') || document.querySelector('[data-e2e="video-container"]');

                if (videoContainer || document) {
                    const video = document.querySelector('video');
                    if (video) {
                        imageUrl = video.poster;
                        if (video.src) videoUrl = video.src;
                    }

                    const descEl = document.querySelector('[data-e2e="browse-video-desc"]') || document.querySelector('[data-e2e="video-desc"]');
                    if (descEl) description = descEl.textContent;

                    const authorEl = document.querySelector('[data-e2e="browse-user-details"] h3') || document.querySelector('[data-e2e="user-title"]');
                    if (authorEl) title = authorEl.textContent + " on TikTok";

                    // Post URL
                    // Usually the current URL if we are on the video page, but on feed it's different.
                    // On feed, find the link to the video.
                    const link = videoContainer.closest('a') || videoContainer.querySelector('a');
                    if (link) postUrl = link.href;
                    else if (window.location.href.includes('/video/')) postUrl = window.location.href;
                }
                if (!title) title = "TikTok Video";
            }

            // --- PINTEREST (Legacy support) ---
            else if (hostname.includes('pinterest')) {
                const pinContainer = target?.closest('[data-test-id="pin"]') ||
                    target?.closest('[data-test-id="visual-content-container"]') ||
                    document.querySelector('[data-test-id="visual-content-container"]') ||
                    document.querySelector('main');

                if (pinContainer) {
                    const pinImg = pinContainer.querySelector('img');
                    if (pinImg) {
                        if (pinImg.srcset) {
                            const sources = pinImg.srcset.split(',');
                            imageUrl = sources[sources.length - 1].trim().split(' ')[0];
                        } else {
                            imageUrl = pinImg.src;
                        }
                    }
                    title = pinContainer.querySelector('h1')?.textContent || pinImg?.alt;
                    description = pinContainer.querySelector('[data-test-id="main-pin-description-text"]')?.textContent;
                }
                if (title) title = title.replace(" - Pinterest", "").trim();
            }

            // 3. Robust Generic Fallback
            // If specific extractors failed, use generic but smart heuristics
            if (!imageUrl && target) {
                if (target.tagName === 'IMG') {
                    imageUrl = target.src;
                    title = target.alt;
                } else if (target.tagName === 'VIDEO') {
                    imageUrl = target.poster;
                    videoUrl = target.src;
                } else {
                    const img = target.querySelector('img');
                    if (img) {
                        imageUrl = img.src;
                        title = img.alt;
                    }
                }
            }

            // 4. Meta Tags (Lowest priority but reliable)
            if (!imageUrl) imageUrl = document.querySelector('meta[property="og:image"]')?.content;
            if (!title) title = document.querySelector('meta[property="og:title"]')?.content || document.title;
            if (!description) description = document.querySelector('meta[property="og:description"]')?.content;

            // Cleanup
            if (title && title.length > 100) title = title.substring(0, 100) + "...";

            sendResponse({ imageUrl, title, description, videoUrl, postUrl });
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
            background: rgba(15, 15, 20, 0.9);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 12px 20px;
            box-shadow: 
                0 10px 30px rgba(0, 0, 0, 0.5),
                0 0 0 1px rgba(255, 255, 255, 0.1);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: white;
            opacity: 0;
            transform: translateX(20px) scale(0.9);
            transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            width: max-content;
            pointer-events: auto; /* Enable interaction */
            cursor: pointer;
            position: relative;
            overflow: hidden;
            user-select: none;
        }

        .brainia-toast:hover {
            background: rgba(25, 25, 35, 0.95);
            border-color: rgba(110, 86, 207, 0.5);
            transform: scale(1.02);
        }

        .brainia-toast.visible {
            opacity: 1;
            transform: translateX(0) scale(1);
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
                rgba(97, 42, 254, 0.3), 
                rgba(76, 194, 233, 0.3),
                rgba(16, 20, 153, 0.2)
            );
            z-index: -1;
            filter: blur(20px);
            animation: rotate_orb 10s linear infinite;
        }

        @keyframes rotate_orb {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .icon-container {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            background: ${type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(110, 86, 207, 0.4)'};
            border-radius: 50%;
            color: ${type === 'error' ? '#ff6b6b' : '#c4b5fd'};
        }

        .message {
            font-size: 14px;
            font-weight: 600;
            line-height: 1.4;
            color: white;
        }
    `;

    // Content
    const toast = document.createElement('div');
    toast.className = 'brainia-toast';
    toast.title = "Click to open Brainia";

    // SVG Icon
    const successIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

    toast.innerHTML = `
        <div class="orb-glow"></div>
        <div class="icon-container">
            ${successIcon}
        </div>
        <span class="message">${message}</span>
    `;

    // Interaction logic
    toast.onclick = () => {
        window.open('https://app.brainia.space', '_blank');
    };

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
