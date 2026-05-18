// app/manifest.ts
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Prima Build',
    short_name: 'Prima Build',
    description: 'Prima Build Project Portal',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F5F6FA',
    theme_color: '#11144C',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}