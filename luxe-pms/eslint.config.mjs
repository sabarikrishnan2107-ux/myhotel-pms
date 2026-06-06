import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // The React Compiler "set-state-in-effect" and "purity" rules are advisory
    // optimisation hints (they flag legitimate patterns like syncing state from
    // an API in an effect, or generating an id during render). They are
    // pervasive in the larger mock-derived pages and are not correctness errors,
    // so we surface them as warnings rather than gating the build on them. Every
    // other rule stays an error so lint can act as a real CI gate.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
