/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    minimumCacheTTL: 0,
    unoptimized: true,
  },
  i18n: undefined, // 明确禁用国际化
};

export default nextConfig;