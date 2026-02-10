import { NextRequest, NextResponse } from 'next/server';
import ogs from 'open-graph-scraper';

const MOBILE_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

export async function GET() {
    return NextResponse.json({ status: 'Metadata API is active', method: 'GET' });
}

export async function POST(req: NextRequest) {
    try {
        const { url: rawUrl, itemId, userId } = await req.json();

        if (!rawUrl) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // --- Tier 0: URL Cleaning ---
        let url = rawUrl;
        try {
            const urlObj = new URL(url);
            ['utm_source', 'utm_medium', 'igshid', 'fbclid', 'share_id', 's', 't', 'ref'].forEach(param =>
                urlObj.searchParams.delete(param)
            );
            url = urlObj.toString();
        } catch (e) { }

        console.log('[SmartMetadata] Revamped Processor starting for:', url);

        const isSocial = /instagram\.com|tiktok\.com|facebook\.com|twitter\.com|x\.com|youtube\.com|linkedin\.com/i.test(url);

        // --- Tier 1: Optimized OGS Fetch ---
        let result: any = null;
        try {
            const ogsRes = await ogs({
                url,
                timeout: 10000,
                fetchOptions: {
                    headers: { 'User-Agent': MOBILE_AGENT }
                }
            });
            result = ogsRes.result;
        } catch (e) {
            console.warn('[SmartMetadata] OGS failed:', e);
        }

        let metadata: any = {
            title: result?.ogTitle || result?.twitterTitle || '',
            description: result?.ogDescription || result?.twitterDescription || '',
            image: result?.ogImage?.[0]?.url || result?.twitterImage?.[0]?.url || '',
            favicon: result?.favicon || '',
            author: result?.author || result?.ogArticleAuthor || '',
            siteName: result?.ogSiteName || result?.twitterSite || '',
            platform: 'web',
            isSocial
        };

        // --- Tier 1.5: Robust Simple Fetch Fallback (for Title) ---
        if (!metadata.title) {
            try {
                console.log('[SmartMetadata] Trying Tier 1.5 Simple Fetch...');
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);
                const res = await fetch(url, { headers: { 'User-Agent': MOBILE_AGENT }, signal: controller.signal });
                const text = await res.text();
                clearTimeout(timeoutId);

                const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i) ||
                    text.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                    text.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i) ||
                    text.match(/<meta\s+name=["']title["']\s+content=["']([^"']+)["']/i);

                if (titleMatch && titleMatch[1]) {
                    metadata.title = titleMatch[1].trim();
                }

                if (!metadata.siteName) {
                    const siteMatch = text.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);
                    if (siteMatch && siteMatch[1]) metadata.siteName = siteMatch[1].trim();
                }
            } catch (e) { }
        }

        // --- Tier 2: Microlink Fallback for Social Media or Missing Media ---
        if ((isSocial || !metadata.image || !metadata.title) && !url.includes('localhost')) {
            console.log('[SmartMetadata] Triggering Tier 2 Fallback (Microlink)...');
            try {
                const mlRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&meta=true`);
                const mlData = await mlRes.json();

                if (mlData.status === 'success') {
                    const data = mlData.data;
                    metadata.title = metadata.title || data.title;
                    metadata.description = metadata.description || data.description;
                    metadata.image = data.image?.url || data.screenshot?.url || metadata.image;
                    metadata.favicon = metadata.favicon || data.logo?.url;
                    metadata.author = metadata.author || data.author;
                    metadata.siteName = metadata.siteName || data.publisher || data.provider;
                    metadata.platform = data.provider || metadata.platform;
                }
            } catch (e) {
                console.error('[SmartMetadata] Microlink fallback failed:', e);
            }
        }

        // --- Tier 3: Platform Specific High-Fidelity Extraction ---
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            metadata.platform = 'youtube';
            if (!metadata.image) {
                const vid = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
                if (vid) metadata.image = `https://img.youtube.com/vi/${vid[1]}/maxresdefault.jpg`;
            }
        } else if (url.includes('instagram.com')) {
            metadata.platform = 'instagram';
        } else if (url.includes('tiktok.com')) {
            metadata.platform = 'tiktok';
        } else if (url.includes('twitter.com') || url.includes('x.com')) {
            metadata.platform = 'twitter';
        } else if (url.includes('facebook.com')) {
            metadata.platform = 'facebook';
        }

        // --- Final Title and Description Cleanup ---
        if (!metadata.siteName) {
            try {
                const domain = new URL(url).hostname.replace('www.', '');
                metadata.siteName = domain.charAt(0).toUpperCase() + domain.slice(1).split('.')[0];
            } catch (e) { }
        }

        if (!metadata.title || /((https?:\/\/)|(www\.))[^\s]+/i.test(metadata.title) ||
            /capturing|shared link|sharedlink/i.test(metadata.title)) {
            metadata.title = metadata.siteName || "Captured Link";
        }

        // --- Phase 4: Image Mirroring (Local Redundancy) ---
        // If we have an external image, try to mirror it to Supabase immediately
        if (metadata.image && !metadata.image.includes('supabase.co')) {
            try {
                const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
                if (itemId && userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

                    const imgRes = await fetch(metadata.image);
                    if (imgRes.ok) {
                        const blob = await imgRes.blob();
                        const filename = `${userId}/${itemId}_preview.jpg`;
                        const { error: uploadError } = await supabase.storage
                            .from('screenshots')
                            .upload(filename, blob, { contentType: blob.type || 'image/jpeg', upsert: true });

                        if (!uploadError) {
                            const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(filename);
                            metadata.image = publicUrl;
                        }
                    }
                }
            } catch (e) { }
        }

        // Normalize description check
        if (metadata.description) {
            const cleanDesc = metadata.description.toLowerCase().trim();
            const cleanUrl = url.toLowerCase().trim().replace(/\/$/, "");
            if (cleanDesc === cleanUrl || cleanDesc === cleanUrl.replace(/^https?:\/\//, "")) {
                metadata.description = '';
            }
        }

        // --- Tier 5: Database Auto-Update (Optional Sync) ---
        if (itemId && userId) {
            console.log(`[SmartMetadata] Attempting DB auto-sync for itemId: ${itemId}`);
            try {
                const { createClient } = await import('@supabase/supabase-js');
                const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

                if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
                    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
                    const { data: item } = await supabase.from('items').select('metadata').eq('id', itemId).single();
                    const existingMetadata = item?.metadata || {};

                    // Smart Merge: Only keep existing description if it's longer than what we just found
                    const finalMetadataToSync = {
                        ...metadata,
                        ...existingMetadata,
                        title: (metadata.title && !/Capturing|Shared Link/i.test(metadata.title)) ? metadata.title : existingMetadata.title,
                        image: existingMetadata.image?.includes('supabase.co') ? existingMetadata.image : metadata.image,
                        description: (existingMetadata.description?.length > metadata.description?.length) ? existingMetadata.description : metadata.description,
                        source: 'api-metadata-auto-sync'
                    };

                    await supabase.from('items').update({ metadata: finalMetadataToSync }).eq('id', itemId);
                }
            } catch (e) { }
        }

        console.log('[SmartMetadata] Final Metadata Result:', {
            title: metadata.title,
            hasImage: !!metadata.image,
            platform: metadata.platform,
            author: metadata.author
        });

        return NextResponse.json(metadata);

    } catch (error) {
        console.error('[SmartMetadata] Critical Processing Error:', error);
        return NextResponse.json({ error: 'Process failed' }, { status: 500 });
    }
}
