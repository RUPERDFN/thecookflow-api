/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    files: ["**/*.ts"],
    ignores: ["dist/**/*"],
    languageOptions: {
      parser: require.resolve("@typescript-eslint/parser"),
      parserOptions: {
        projectService: true
      }
    },
    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin")
    },
    rules: {
      "no-console": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ]
    }
  },
  require("eslint-config-prettier")
];
