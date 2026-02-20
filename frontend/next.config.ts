import type { NextConfig } from "next";
import { execSync } from 'child_process';

const commitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
})();

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  reactCompiler: false,
  env: {
    NEXT_PUBLIC_COMMIT_HASH: commitHash,
  },
};

export default nextConfig;
