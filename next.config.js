/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // URL exata exigida pela Loft para integração de imóveis
      // https://crm-rojex.vercel.app/portais/feeds/arquivo.xml
      {
        source: '/portais/feeds/arquivo.xml',
        destination: '/api/feed',
      },
      // Alternativas para outros portais
      {
        source: '/feed.xml',
        destination: '/api/feed',
      },
      {
        source: '/portais/feeds/imoveis.xml',
        destination: '/api/feed',
      },
    ];
  },
};

module.exports = nextConfig;
