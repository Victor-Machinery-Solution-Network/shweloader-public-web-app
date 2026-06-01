import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** eslint-config-next@16 ships flat configs — spread them directly. */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  {
    rules: {
      // The flagged cases are SSR-safe one-time initialization from browser-only
      // sources (cookie / localStorage / URL hash) after hydration, or input
      // sync on navigation — not cascading-render bugs. Keep them as warnings.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
