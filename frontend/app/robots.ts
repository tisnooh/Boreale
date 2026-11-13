import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';
import { isPreview } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  if (isPreview()) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/checkout', '/account', '/order/', '/cart', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
