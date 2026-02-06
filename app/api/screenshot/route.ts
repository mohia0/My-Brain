import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: NextRequest) {
    try {
        const { url, itemId, userId } = await req.json();

        if (!url || !itemId || !userId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Use Microlink to get a screenshot
        const screenshotApi = `https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;

        const response = await fetch(screenshotApi);
        if (!response.ok) throw new Error('Microlink capture failed');

        const blob = await response.blob();
        const filename = `${userId}/${itemId}_ss.jpg`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('screenshots')
            .upload(filename, blob, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('screenshots')
            .getPublicUrl(filename);

        // Update the item in the database
        const { error: updateError } = await supabase
            .from('items')
            .update({
                'metadata->image': publicUrl
            } as any)
            .eq('id', itemId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, url: publicUrl });

    } catch (error: any) {
        console.error('Screenshot API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
