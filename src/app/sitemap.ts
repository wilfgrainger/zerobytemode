import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.zerobytemode.com';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    // We can add paths for specific tools later if we expand
    // e.g. { url: `${baseUrl}/tools/avif-compressor`, changeFrequency: 'monthly', priority: 0.8 }
  ];
}
