import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ogs from 'open-graph-scraper';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MOBILE_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

export async function GET() {
    return NextResponse.json({ status: 'Screenshot API is active', method: 'GET' });
}

export async function POST(req: NextRequest) {
    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { url: rawUrl, itemId, userId } = await req.json();

        if (!rawUrl) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }
        if (!itemId || !userId) { // Added back itemId and userId check
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
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

        console.log('[LinkTruth] Processing:', url);

        const isSocial = /instagram\.com|tiktok\.com|facebook\.com|twitter\.com|x\.com|youtube\.com|linkedin\.com/i.test(url);
        const forceMicrolink = url.includes('instagram.com') || url.includes('tiktok.com');

        // Fetch current item to see if it already has values
        const { data: item } = await supabase.from('items').select('*').eq('id', itemId).single();
        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

        let pageTitle = '';
        let pageDesc = '';
        let finalImageUrl = '';

        if (forceMicrolink || isSocial) {
            console.log('[LinkTruth] Social/Hard site detected, using Microlink natively');
            try {
                const mlRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&meta=true`);
                const mlData = await mlRes.json();

                if (mlData.status === 'success') {
                    const d = mlData.data;
                    pageTitle = d.title;
                    pageDesc = d.description;
                    finalImageUrl = d.image?.url || d.screenshot?.url;
                }
            } catch (e) {
                console.error('[LinkTruth] Microlink pre-fetch failed:', e);
            }
        }

        if (!finalImageUrl) {
            if (!isSocial) {
                // Tier 1: Specialized OGS (only for non-social sites)
                try {
                    const { result } = await ogs({
                        url,
                        timeout: 10000,
                        fetchOptions: { headers: { 'User-Agent': MOBILE_AGENT } }
                    });
                    pageTitle = pageTitle || result.ogTitle || result.twitterTitle || '';
                    pageDesc = pageDesc || result.ogDescription || result.twitterDescription || '';
                    finalImageUrl = result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || '';
                } catch (e) {
                    console.warn('[LinkTruth] OGS failed:', e);
                }
            }

            // Tier 2: Microlink Fallback
            if (!finalImageUrl) {
                console.log('[LinkTruth] Image still missing, triggering Microlink fallback');
                try {
                    const mlRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&meta=true`);
                    const mlData = await mlRes.json();
                    if (mlData.status === 'success') {
                        const d = mlData.data;
                        pageTitle = pageTitle || d.title || '';
                        pageDesc = pageDesc || d.description || '';
                        finalImageUrl = d.image?.url || d.screenshot?.url || '';
                    }
                } catch (e) {
                    console.error('[LinkTruth] Microlink fallback failed:', e);
                }
            }
        }

        // --- Phase 3: Mirroring to Supabase ---
        if (finalImageUrl) {
            try {
                const imgRes = await fetch(finalImageUrl);
                if (imgRes.ok) {
                    const blob = await imgRes.blob();
                    const filename = `${userId}/${itemId}_media.jpg`;

                    const { error: uploadError } = await supabase.storage
                        .from('screenshots')
                        .upload(filename, blob, { contentType: blob.type || 'image/jpeg', upsert: true });

                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(filename);
                        finalImageUrl = publicUrl;
                    }
                }
            } catch (e) {
                console.warn('[LinkTruth] Mirroring failed, using remote URL as fallback');
            }
        }

        // --- Phase 4: Final Database Sync ---
        const currentMetadata = item.metadata || {};

        // Final Title Cleanup: if title is just a URL, fix it
        let cleanTitle = pageTitle || currentMetadata.title;
        const isPlaceholder = !cleanTitle ||
            /capturing|shared link|sharedlink/i.test(cleanTitle.toLowerCase());

        if (isPlaceholder || (cleanTitle && /((https?:\/\/)|(www\.))[^\s]+/i.test(cleanTitle))) {
            try {
                const domain = new URL(url).hostname.replace('www.', '');
                cleanTitle = domain.charAt(0).toUpperCase() + domain.slice(1).split('.')[0];
            } catch (e) {
                cleanTitle = "Captured Link";
            }
        }

        const finalMetadata = {
            ...currentMetadata,
            title: cleanTitle,
            description: pageDesc || currentMetadata.description,
            image: finalImageUrl || currentMetadata.image,
            siteName: currentMetadata.siteName || (isSocial ? url.match(/https?:\/\/(?:www\.)?([^\/\.]+)/)?.[1] : '') || cleanTitle,
            source: 'api-screenshot-truth'
        };

        const { error: updateError } = await supabase
            .from('items')
            .update({ metadata: finalMetadata })
            .eq('id', itemId);

        if (!updateError) {
            console.log('[LinkTruth] Database updated successfully for:', itemId, { hasTitle: !!cleanTitle, hasImage: !!finalImageUrl });
        } else {
            console.error('[LinkTruth] Database update failed:', updateError.message);
        }

        return NextResponse.json({ success: true, metadata: finalMetadata });

    } catch (error: any) {
        console.error('[LinkTruth] Critical Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
