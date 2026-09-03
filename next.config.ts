import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O @node-rs/argon2 é um módulo nativo (binário pré-compilado, não é
  // JavaScript puro). Sem isto, o empacotador do Next.js tentava incluí-lo
  // dentro do bundle do servidor e o build para a Vercel falhava.
  serverExternalPackages: ["@node-rs/argon2"],

  // O Next.js não envia headers de segurança por si — têm de ser pedidos.
  // (HTTPS e HSTS não estão aqui porque a Vercel já os aplica sozinha.)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Impede que a portaria seja carregada dentro de um <iframe>
          // noutro site — o ataque clássico de sobrepor uma página
          // invisível para roubar cliques do porteiro.
          { key: "X-Frame-Options", value: "DENY" },

          // Impede o browser de adivinhar o tipo de um ficheiro em vez de
          // respeitar o Content-Type que enviámos.
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Sites externos deixam de receber o endereço completo da página
          // de onde viemos: os nossos URLs têm ids de alunos e de turmas.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // A portaria PRECISA da câmara para ler os códigos QR, por isso
          // não se pode bloquear — só limitar à nossa própria origem.
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
