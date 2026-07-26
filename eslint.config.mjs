import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Desenho compartilhado do certificado: o mesmo JSX vai para o Satori
    // (onde <img> não vira DOM) e para o preview do editor, onde as imagens
    // são data URIs e rotas dinâmicas — next/image não se aplica em nenhum
    // dos dois. As imagens são decorativas e já levam alt="".
    files: ["src/lib/certificate-canvas.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
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
