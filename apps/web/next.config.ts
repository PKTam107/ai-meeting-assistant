import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We live in a pnpm monorepo; pin the workspace root so Next doesn't infer it
  // from the repo-root lockfile and emit the "multiple lockfiles" warning.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
