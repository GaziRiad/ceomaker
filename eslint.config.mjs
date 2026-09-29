import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: "apps/web/" },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/.turbo/**",
    "**/dist/**",
    "**/next-env.d.ts",
    "packages/db/migrations/**",
  ]),
]);
