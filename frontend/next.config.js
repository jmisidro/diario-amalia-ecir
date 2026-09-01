/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * Extend the rewrite proxy timeout beyond the default 30 seconds.
   * RAG pipeline requests (/api/user/chat) can take longer than 30s
   * as the LLM call alone may take 45-90s depending on load.
   * Value is in milliseconds.
   */
  experimental: {
    proxyTimeout: 120_000, // 2 minutes
  },
  async rewrites() {
    return [
      {
        source: '/api/user/:path*',
        destination: `${process.env.API_URL}/api/user/:path*`,
      },
      {
        source: '/api/system/:path*',
        destination: `${process.env.API_URL}/api/system/:path*`,
      },
    ];
  },
};

export default nextConfig;
