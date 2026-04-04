import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  {
    files: ["src/**/*.{js,jsx}"],

    ignores: [
      "dist",
      "node_modules",
      "src/components/ui/**/*" // shadcn generated
    ],

    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,

    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    settings: {
      react: {
        version: "detect",
      },
    },

    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },

    rules: {
      /* ================= CLEAN IMPORTS ================= */
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      /* ================= REACT ================= */
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-uses-react": "off", // React 17+
      "react/jsx-uses-vars": "error",

      /* ================= HOOKS ================= */
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      /* ================= CUSTOM FIXES ================= */
      "react/no-unknown-property": [
        "error",
        {
          ignore: ["cmdk-input-wrapper", "toast-close"],
        },
      ],
    },
  },
];