import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Rotas de ImageResponse: o JSX destes arquivos é renderizado pelo
    // Satori para gerar PNG — <img> ali não vira DOM, então next/image
    // e alt-text não se aplicam.
    files: [
      "src/app/api/cert/**/route.tsx",
      "src/app/api/verificar-certificado/**/route.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
      "jsx-a11y/alt-text": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
