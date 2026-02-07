import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: NextRequest) {
    try {
        const { url, itemId, userId } = await req.json();
        console.log(`[LinkProcessor] Processing: ${url}`);

        if (!url || !itemId || !userId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
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
            // Updated Microlink query: Mobile UI + Metadata + Screenshot
            // width=375 & isMobile=true makes it look like it came from the phone
            const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&meta=true&viewport.width=375&viewport.height=812&viewport.isMobile=true&viewport.hasTouch=true&user_agent=Mozilla/5.0%20(iPhone;%20CPU%20iPhone%20OS%2016_0%20like%20Mac%20OS%20X)%20AppleWebKit/605.1.15%20(KHTML,%20like%20Gecko)%20Version/16.0%20Mobile/15E148%20Safari/604.1`;

            const response = await fetch(microlinkUrl);
            const data = await response.json();

            if (data.status === 'success') {
                const meta = data.data;
                pageTitle = meta.title;
                pageDesc = meta.description;

                // STRATEGY: 
                // 1. Favor the Site's OpenGraph Image (data.image.url). 
                //    This bypasses login walls for Facebook/Instagram/X.
                // 2. Fallback to the Mobile Screenshot (data.screenshot.url).
                const rawImageUrl = meta.image?.url || meta.screenshot?.url;

                if (rawImageUrl) {
                    // Download and mirror to our Supabase storage for persistence
                    const imgRes = await fetch(rawImageUrl);
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
        } catch (captureErr) {
            console.error('[LinkProcessor] Microlink failed:', captureErr);
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

        return NextResponse.json({ success: true, url: finalImageUrl });

    } catch (error: any) {
        console.error('[LinkProcessor] Global Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
