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
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // For image uploads
    },
  },
}

module.exports = nextConfig
