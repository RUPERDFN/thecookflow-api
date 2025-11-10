import path from "node:path";
import { fileURLToPath } from "node:url";

import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintPluginImport from "eslint-plugin-import";
import eslintConfigPrettier from "eslint-config-prettier";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const strictTypeCheckedRules = tseslint.configs["strictTypeChecked"]?.rules ?? {};
const stylisticTypeCheckedRules = tseslint.configs["stylisticTypeChecked"]?.rules ?? {};

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      "dist/**/*",
      "attached_assets/**/*",
      "android/**/*",
      "thecookflow-api/**/*",
      "thecookflow-android/**/*",
      "**/build/",
      ".changeset/**/*"
    ],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": tseslint,
      import: eslintPluginImport,
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: ["tsconfig.json", "tsconfig.build.json"],
        },
      },
    },
    rules: {
      ...strictTypeCheckedRules,
      ...stylisticTypeCheckedRules,
      "no-console": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          disallowTypeAnnotations: false,
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "import/order": [
        "error",
        {
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"], "object"],
          "newlines-between": "always",
          pathGroups: [
            {
              pattern: "@/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
        },
      ],
      "import/newline-after-import": ["error", { count: 1 }],
    },
  },
  eslintConfigPrettier,
];
