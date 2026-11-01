// ESLint complements oxlint (see .oxlintrc.json): it only runs the custom
// `quality/*` gates. General lint rules stay in oxlint.
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

import quality from "./eslint-rules/index.cjs";

const testFiles = [
  "**/*{.,-}{test,spec}.{js,jsx,ts,tsx,mjs,cjs,mts,cts}",
  "**/{__tests__,__mocks__,fixtures,mocks}/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}",
];

export default defineConfig([
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
    // Existing source has `eslint-disable react-hooks/*` comments; oxlint owns
    // that rule, so register an inert stub to keep ESLint from erroring.
    linterOptions: { reportUnusedDisableDirectives: "off" },
    plugins: { "react-hooks": { rules: { "exhaustive-deps": { create: () => ({}) } } } },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"],
    plugins: { quality },
    rules: {
      "quality/max-lines": ["error", { max: 350 }],
      "quality/no-direct-console": ["error", { logger: "the project logging helper" }],
    },
  },
  {
    // Same file budget for tests, at "warn". Must come after the block above.
    files: testFiles,
    plugins: { quality },
    rules: {
      "quality/max-lines": ["warn", { max: 350, includeTests: true }],
    },
  },
  globalIgnores(["node_modules/**", "dist/**", "coverage/**", ".claude/**", ".playwright-mcp/**", ".superpowers/**", "design-preview/**", ".vercel/**", "eslint-rules/**"]),
]);
