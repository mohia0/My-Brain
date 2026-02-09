import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ogs from 'open-graph-scraper';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        let { url, itemId, userId } = await req.json();
        console.log(`[LinkProcessor] Processing: ${url}`);

        if (!url || !itemId || !userId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Clean trackers from URL
        try {
            const urlObj = new URL(url);
            ['utm_source', 'utm_medium', 'igshid', 'fbclid', 'share_id'].forEach(param =>
                urlObj.searchParams.delete(param)
            );
            url = urlObj.toString();
        } catch (e) {
            // If URL parsing fails, proceed with original URL
        }

        // Consistency check: Wait for item record
        let item = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            const { data } = await supabase.from('items').select('metadata').eq('id', itemId).single();
            if (data) { item = data; break; }
            await new Promise(r => setTimeout(r, 600));
        }
        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

        let finalImageUrl = '';
        let pageTitle = '';
        let pageDesc = '';

        try {
            const isInstagram = url.includes('instagram.com');
            const isTikTok = url.includes('tiktok.com');
            const isFacebook = url.includes('facebook.com');

            // Social Media Strategy: Prefer Metadata/OGS over Screenshot
            // because login walls block screenshots.
            if (isInstagram || isTikTok || isFacebook) {
                console.log('[LinkProcessor] Social media detected - using metadata-only strategy');

                // Configure OGS with a mobile user agent to try and get better results
                const { result } = await ogs({
                    url,
                    timeout: 10000,
                    fetchOptions: {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
                        }
                    }
                });

                if (result && result.success) {
                    pageTitle = result.ogTitle || result.twitterTitle || '';
                    pageDesc = result.ogDescription || result.twitterDescription || '';

                    const ogImages = result.ogImage || result.twitterImage || [];

                    // Filter out profile pics or generic assets
                    const isProfilePic = (imgUrl: string) => {
                        if (!imgUrl) return false;
                        const low = imgUrl.toLowerCase();
                        return low.includes('/profile_pic/') ||
                            low.includes('/avatar/') ||
                            low.includes('static.xx.fbcdn.net');
                    };

                    let postImage = ogImages.find((img: any) => img.url && !isProfilePic(img.url))?.url;

                    if (!postImage && ogImages.length > 0) {
                        // Fallback to first image if everything looks like a profile pic (or if detection is wrong)
                        postImage = ogImages[0].url;
                    }

                    console.log('[LinkProcessor] Selected Social Image:', postImage);

                    if (postImage) {
                        // Download and mirror to Supabase
                        try {
                            const imgRes = await fetch(postImage);
                            if (imgRes.ok) {
                                const blob = await imgRes.blob();
                                const filename = `${userId}/${itemId}_preview.jpg`;

                                const { error: uploadError } = await supabase.storage
                                    .from('screenshots')
                                    .upload(filename, blob, { contentType: blob.type || 'image/jpeg', upsert: true });

                                if (!uploadError) {
                                    const { data: { publicUrl } } = supabase.storage
                                        .from('screenshots')
                                        .getPublicUrl(filename);
                                    finalImageUrl = publicUrl;
                                }
                            }
                        } catch (e) {
                            console.warn('[LinkProcessor] Failed to download/upload social image:', e);
                            // If download fails, use the remote URL directly as fallback? 
                            // Usually better to leave empty than broken link, 
                            // but for some CDNs it might work.
                            // Let's rely on the metadata update at the end.
                        }
                    }
                }
            } else {
                // For general web pages, use Microlink with screenshot
                const microlinkUrl = new URL('https://api.microlink.io');
                microlinkUrl.searchParams.append('url', url);
                microlinkUrl.searchParams.append('screenshot', 'true');
                microlinkUrl.searchParams.append('meta', 'true');
                microlinkUrl.searchParams.append('viewport.width', '390');
                microlinkUrl.searchParams.append('viewport.height', '844'); // iPhone 12/13/14
                microlinkUrl.searchParams.append('viewport.isMobile', 'true');
                microlinkUrl.searchParams.append('viewport.hasTouch', 'true');
                // Use a standard iOS User Agent
                microlinkUrl.searchParams.append('user_agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');

                const response = await fetch(microlinkUrl.toString());
                const data = await response.json();

                if (data.status === 'success') {
                    const meta = data.data;
                    pageTitle = meta.title || '';
                    pageDesc = meta.description || '';

                    // Prefer OG image if high quality, else screenshot
                    const ogImage = meta.image?.url;
                    const screenshotImage = meta.screenshot?.url;

                    // If we have a screenshot, it's usually what we want for "visual bookmark"
                    // But if it's a blog post, the ogImage might be better.
                    // Strategy: specific check? No, let's prefer screenshot for "browsers" as user asked for visual.
                    const candidateImage = screenshotImage || ogImage;

                    if (candidateImage) {
                        const imgRes = await fetch(candidateImage);
                        if (imgRes.ok) {
                            const blob = await imgRes.blob();
                            const filename = `${userId}/${itemId}_preview.jpg`;

                            const { error: uploadError } = await supabase.storage
                                .from('screenshots')
                                .upload(filename, blob, { contentType: blob.type, upsert: true });

                            if (!uploadError) {
                                const { data: { publicUrl } } = supabase.storage
                                    .from('screenshots')
                                    .getPublicUrl(filename);
                                finalImageUrl = publicUrl;
                            }
                        }
                    }
                }

                // Fallback: If Microlink failed or returned no image, try OGS locally
                if (!pageTitle || !finalImageUrl) {
                    console.log('[LinkProcessor] Microlink incomplete, trying OGS fallback...');
                    const { result } = await ogs({ url, timeout: 5000 });

                    if (result && result.success) {
                        pageTitle = pageTitle || result.ogTitle || result.twitterTitle || '';
                        pageDesc = pageDesc || result.ogDescription || result.twitterDescription || '';

                        const fallbackImage = result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url;
                        if (!finalImageUrl && fallbackImage) {
                            // Try to download and upload this one
                            try {
                                const imgRes = await fetch(fallbackImage);
                                if (imgRes.ok) {
                                    const blob = await imgRes.blob();
                                    const filename = `${userId}/${itemId}_preview_fb.jpg`;
                                    await supabase.storage.from('screenshots').upload(filename, blob, { upsert: true });
                                    const { data } = supabase.storage.from('screenshots').getPublicUrl(filename);
                                    finalImageUrl = data.publicUrl;
                                }
                            } catch (e) { }
                        }
                    }
                }
            }
        } catch (captureErr) {
            console.error('[LinkProcessor] Capturing failed:', captureErr);
        }

        const currentMetadata = item.metadata || {};
        const updatedMetadata = {
            ...currentMetadata,
            image: finalImageUrl || currentMetadata.image,
            title: pageTitle || currentMetadata.title || currentMetadata.description, // Fallback title
            description: pageDesc || currentMetadata.description
        };

        const { error: updateError } = await supabase
            .from('items')
            .update({ metadata: updatedMetadata })
            .eq('id', itemId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, url: finalImageUrl, metadata: updatedMetadata });

    } catch (error: any) {
        console.error('[LinkProcessor] Global Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
