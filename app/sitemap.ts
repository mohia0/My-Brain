import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
    if (process.env.IS_CAPACITOR_BUILD === 'true') {
        return [];
    }
    return [
        {
            url: 'https://brainia.space',
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
    ];
}
