import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/dist/**",
    "**/next-env.d.ts",
    "**/android/**",
    "**/ios/**",
  ]),
  {
    files: ["**/components/atoms/ui.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
  { settings: { next: { rootDir: ["apps/web", "apps/admin"] } } },
]);
