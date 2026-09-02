import { defineConfig } from "vitest/config";
import path from "node:path";

// Vitest não lê o "paths" do tsconfig.json sozinho — repetimos aqui o mesmo
// alias "@/*" → "src/*" que já existe no tsconfig.json, para os testes
// poderem importar código com o mesmo caminho usado no resto da app.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
  },
});
