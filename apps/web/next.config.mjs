const nextConfig = {
  reactStrictMode: true,
  // Vercel's Next.js 16.3 adapter expects its native output format. The
  // standalone output remains enabled for the Docker deployment.
  output: process.env.VERCEL ? undefined : 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
