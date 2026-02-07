import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: NextRequest) {
    try {
        let { url, itemId, userId } = await req.json();
        console.log(`[LinkProcessor] Processing: ${url}`);

        if (!url || !itemId || !userId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Clean trackers from URL (can trigger security challenges)
        const urlObj = new URL(url);
        urlObj.searchParams.delete('utm_source');
        urlObj.searchParams.delete('utm_medium');
        urlObj.searchParams.delete('igshid');
        urlObj.searchParams.delete('fbclid');
        url = urlObj.toString();

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

            // For Instagram, ONLY use metadata - screenshots always hit login walls
            if (isInstagram) {
                console.log('[LinkProcessor] Instagram detected - using metadata-only strategy');
                const ogs = require('open-graph-scraper');
                const { result } = await ogs({ url, timeout: 8000 });

                if (result) {
                    pageTitle = result.ogTitle || result.twitterTitle || '';
                    pageDesc = result.ogDescription || result.twitterDescription || '';

                    console.log('[LinkProcessor] Instagram OG data:', {
                        title: pageTitle,
                        imageCount: result.ogImage?.length || 0,
                        images: result.ogImage?.map((img: any) => img.url)
                    });

                    // Instagram OG images - filter out profile pics
                    const ogImages = result.ogImage || [];
                    const isProfilePic = (imgUrl: string) => {
                        if (!imgUrl) return false;
                        const low = imgUrl.toLowerCase();
                        // More lenient filtering - only skip obvious profile pics
                        return low.includes('/profile_pic/') || low.includes('/avatar/');
                    };

                    // Find the best quality post image (not profile pic)
                    let postImage = ogImages.find((img: any) => img.url && !isProfilePic(img.url))?.url;

                    // Fallback: if all images were filtered, just use the first one
                    if (!postImage && ogImages.length > 0) {
                        postImage = ogImages[0].url;
                        console.log('[LinkProcessor] Using first available image as fallback');
                    }

                    console.log('[LinkProcessor] Selected image:', postImage);

                    if (postImage) {
                        // Download and mirror to Supabase
                        const imgRes = await fetch(postImage);
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
                            console.log('[LinkProcessor] Image uploaded:', publicUrl);
                        } else {
                            console.error('[LinkProcessor] Upload error:', uploadError);
                        }
                    } else {
                        console.warn('[LinkProcessor] No images found in OG data');
                    }
                }
            } else {
                // For non-Instagram sites, use Microlink with screenshot
                const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&meta=true&viewport.width=390&viewport.height=1290&viewport.isMobile=true&viewport.hasTouch=true&user_agent=Mozilla/5.0%20(iPhone;%20CPU%20iPhone%20OS%2017_2%20like%20Mac%20OS%20X)%20AppleWebKit/605.1.15%20(KHTML,%20like%20Gecko)%20Version/17.2%20Mobile/15E148%20Safari/604.1`;

                const response = await fetch(microlinkUrl);
                const data = await response.json();

                if (data.status === 'success') {
                    const meta = data.data;
                    pageTitle = meta.title || '';
                    pageDesc = meta.description || '';

                    const ogImage = meta.image?.url;
                    const screenshotImage = meta.screenshot?.url;

                    // Prefer OG image for quality, fallback to screenshot
                    const candidateImage = ogImage || screenshotImage;

                    if (candidateImage) {
                        const imgRes = await fetch(candidateImage);
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

                // Fallback for non-Instagram if Microlink fails
                if (!pageTitle || !finalImageUrl) {
                    console.log('[LinkProcessor] Microlink failed, trying OG scraper...');
                    const ogs = require('open-graph-scraper');
                    const { result } = await ogs({ url, timeout: 5000 });

                    if (result) {
                        pageTitle = pageTitle || result.ogTitle || result.twitterTitle || '';
                        pageDesc = pageDesc || result.ogDescription || result.twitterDescription || '';

                        if (!finalImageUrl && result.ogImage?.[0]?.url) {
                            finalImageUrl = result.ogImage[0].url;
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
            title: pageTitle || currentMetadata.title,
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
