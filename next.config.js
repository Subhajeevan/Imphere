/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google profile photos
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com', // Cloudinary images
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co', // Supabase storage
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos', // Mock data images
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com', // Mock data avatars
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // For image uploads
    },
  },
}

module.exports = nextConfig
