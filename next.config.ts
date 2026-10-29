import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // ali-oss is a heavy CJS package with dynamic requires; keep it out of the server bundle.
  serverExternalPackages: ['ali-oss'],
  turbopack: {
    root: path.join(__dirname)
  }
};

export default withNextIntl(nextConfig);
