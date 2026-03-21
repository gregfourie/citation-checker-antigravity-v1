import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf2json', 'pdf-parse'],
};

export default nextConfig;
