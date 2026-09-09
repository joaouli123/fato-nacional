import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

export default defineConfig(
  ...nextVitals.map((config) => ({
    ...config,
    files: ["apps/portal/**/*.{js,jsx,ts,tsx}"],
  })),
  ...nextTypescript.map((config) => ({
    ...config,
    files: ["apps/portal/**/*.{js,jsx,ts,tsx}"],
  })),
  {
    files: ["apps/portal/**/*.{js,jsx,ts,tsx}"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  {
    files: [
      "apps/worker/**/*.ts",
      "apps/scheduler/**/*.ts",
      "packages/shared/**/*.ts",
      "scripts/**/*.mjs",
    ],
    extends: [tseslint.configs.recommended],
  },
  globalIgnores([
    "**/.next/**",
    "**/.turbo/**",
    "**/dist/**",
    "**/node_modules/**",
    "apps/portal/src/generated/**",
    "apps/portal/src/payload-types.ts",
  ]),
);
