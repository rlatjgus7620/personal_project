// 코드 검사(ESLint) 설정 (v2.3). 실행: npm run lint
// Next.js가 권장하는 규칙(next/core-web-vitals)과 TypeScript 규칙(next/typescript)을 씁니다.
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // 검사하지 않을 폴더: 설치·빌드 결과물, 파이썬 서버, 테스트 결과물
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "coverage/**",
      "backend/**",
      "next-env.d.ts",
      "test-results/**",
      "playwright-report/**",
    ],
  },
];

export default eslintConfig;
