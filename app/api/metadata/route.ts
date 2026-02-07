import { NextRequest, NextResponse } from 'next/server';
import ogs from 'open-graph-scraper';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        console.log('[MetadataAPI] Fetching for:', url);
        const { result, error } = await ogs({ url, timeout: 8000 });

        if (error) {
            console.error('[MetadataAPI] OGS error:', error);
            return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 });
        }

        const metadata = {
            title: result.ogTitle || result.twitterTitle || '',
            description: result.ogDescription || result.twitterDescription || '',
            image: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || '',
            favicon: result.favicon || ''
        };

        console.log('[MetadataAPI] Returning:', metadata);

        return NextResponse.json(metadata);

    } catch (error) {
        console.error('[MetadataAPI] Fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 });
    }
}
