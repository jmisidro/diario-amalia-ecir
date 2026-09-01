import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://diariodoamalia.inesctec.pt'
  const now = new Date()

  return [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'hourly', // Hourly summary drops
      priority: 1.0,
    },
    {
      url: `${baseUrl}/noticias`,
      lastModified: now,
      changeFrequency: 'always', // Constantly updating feed
      priority: 0.9,
    },
    {
      url: `${baseUrl}/chat`,
      lastModified: now,
      changeFrequency: 'monthly', // The UI is stable, the content is per-session
      priority: 0.7,
    },
  ]
}
