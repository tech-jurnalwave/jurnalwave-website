import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jurnalwave.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/jurnal-central/', '/halo-jurnal/admin/', '/admin/', '/jw-gate-781', '/jw-vault-992'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
