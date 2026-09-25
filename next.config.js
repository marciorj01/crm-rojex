/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/portais/feeds/arquivo.xml', destination: '/api/feed' },
      { source: '/feed.xml', destination: '/api/feed' },
      { source: '/portais/feeds/imoveis.xml', destination: '/api/feed' },
    ];
  },
};
module.exports = nextConfig;
