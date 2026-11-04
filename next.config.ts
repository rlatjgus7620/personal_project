import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 코드 검사는 npm run lint와 GitHub Actions에서 따로 돌림 (v2.3).
  // 빌드할 때 한 번 더 돌리면 느리고, 검사 경고 때문에 빌드가 막히지 않게 하려고 끔
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
