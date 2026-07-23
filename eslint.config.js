import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    ".output/**",
    "dist/**",
    "node_modules/**",
    "src/assets/**",
    "src/components/**",
    "src/hooks/**",
    "src/integrations/**",
    "src/lib/**",
    "src/routes/**",
    "src/routeTree.gen.ts",
    "src/router.tsx",
    "src/server.ts",
    "src/start.ts"
  ])
]);
