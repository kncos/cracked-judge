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
    },
  },
  {
    ignores: ["mkosi/**", "vmroot/**", "test/**", "eslint.config.js"],
  },
);
