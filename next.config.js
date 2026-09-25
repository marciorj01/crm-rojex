/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Permite que a Loft (e outros portais) acessem o feed XML
      // via URL terminando em .xml, como exigido pela integração.
      // Exemplo: https://crm-rojex.vercel.app/portais/feeds/imoveis.xml
      {
        source: '/portais/feeds/imoveis.xml',
        destination: '/api/feed',
      },
      // Alternativa genérica caso queira usar outro nome de arquivo
      {
        source: '/feed.xml',
        destination: '/api/feed',
      },
    ];
  },
};

module.exports = nextConfig;
