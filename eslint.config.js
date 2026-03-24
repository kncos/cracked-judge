import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Error on unawaited promises
      "@typescript-eslint/no-floating-promises": "error",
      // Ignore unused variables that start with underscore
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // TS control flow can't track assignments inside callbacks, leading to
      // false positives (e.g. timer assigned inside new Promise constructor)
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
    },
  },
  {
    ignores: [
      "mkosi/**",
      "vmroot/**",
      "test/**",
      "eslint.config.js",
      "src/lib/firecracker-types.ts",
    ],
  },
);
