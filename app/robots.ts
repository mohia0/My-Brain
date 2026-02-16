import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
    if (process.env.IS_CAPACITOR_BUILD === 'true') {
        return {
            rules: [],
            sitemap: undefined,
        }
    }
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: '/private/',
        },
        sitemap: 'https://brainia.space/sitemap.xml',
    };
}
