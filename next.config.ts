import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O @node-rs/argon2 é um módulo nativo (binário pré-compilado, não é
  // JavaScript puro). Sem isto, o empacotador do Next.js tentava incluí-lo
  // dentro do bundle do servidor e o build para a Vercel falhava.
  serverExternalPackages: ["@node-rs/argon2"],
};

export default nextConfig;
