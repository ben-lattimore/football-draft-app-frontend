/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'resources.premierleague.com',
        port: '',
        pathname: '/premierleague/photos/players/**',
      },
    ],
  },
};

export default nextConfig;
