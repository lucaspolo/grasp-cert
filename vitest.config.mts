import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // "server-only" lança erro fora do React Server; nos testes vira um stub.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url)
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Fuso fixo para que os testes de data/hora sejam determinísticos.
    env: { TZ: "UTC" },
    // Os testes de 2FA fazem hashing bcrypt real; margem para máquinas lentas.
    testTimeout: 15000,
  },
});
