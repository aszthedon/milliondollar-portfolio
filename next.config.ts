const nextConfig = {
  productionBrowserSourceMaps: false,

  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    webpackMemoryOptimizations: true,
    webpackBuildWorker: true,
    serverSourceMaps: false,
    preloadEntriesOnStart: false,
  },

  webpack: (config: any, { dev }: { dev: boolean }) => {
    if (!dev) {
      config.cache = false;
    }

    return config;
  },
};

export default nextConfig;