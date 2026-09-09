import type { NextConfig } from "next";

/**
 * Content-Security-Policy: diz ao browser de onde é que esta página pode
 * carregar cada tipo de coisa. É a última linha de defesa contra XSS — se
 * um dia entrasse texto malicioso numa página, o browser recusava-se a
 * executar um script vindo de fora.
 *
 * Porquê `'unsafe-inline'` nos scripts: o Next.js injeta na página uns
 * scripts inline próprios (os que "acordam" o React no browser) sem lhes
 * pôr um nonce. Bloqueá-los partia o site inteiro. Continua a valer a
 * pena o resto da política: nada de <object>, nada de <iframe> à volta,
 * formulários só para o nosso próprio site, e ligações só para nós.
 *
 * `'unsafe-eval'` só em desenvolvimento — é o recarregamento automático do
 * Next.js que precisa dele; em produção não vai.
 */
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // `data:` para o código QR (é gerado no servidor como imagem embutida) e
  // `https:` porque a fotografia do aluno é um endereço externo.
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  // A leitura do QR na portaria usa a câmara através de blobs.
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

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

          { key: "Content-Security-Policy", value: CSP },

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
