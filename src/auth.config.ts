import type { NextAuthConfig } from "next-auth";

/**
 * Configuração "leve" do Auth.js: só a parte que decide QUEM PODE VER QUE
 * PÁGINAS. Não inclui os fornecedores de login (Credentials, Google).
 *
 * Existe separada do `auth.ts` por uma razão técnica importante: o
 * `middleware.ts` corre no runtime Edge da Vercel, que não suporta módulos
 * nativos (o Argon2id do Credentials) nem ligações TCP (o Mongoose). Se
 * este ficheiro importasse esses fornecedores, o middleware deixava de
 * arrancar. Por isso os fornecedores reais só são acrescentados no
 * `auth.ts`, que só corre em rotas de servidor normais (runtime Node.js).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    // Qualquer erro do Auth.js (ex.: login Google recusado por não haver
    // conta) volta para o ecrã de login, em vez da página de erro genérica.
    error: "/login",
  },

  session: {
    strategy: "jwt",
    // Um dia letivo. O perfil viaja dentro do próprio token e não é
    // reconfirmado na base de dados a cada pedido (seria uma consulta
    // extra sempre) — ou seja, um aluno apagado ou suspenso continuaria a
    // entrar enquanto o token fosse válido. Com o valor por omissão do
    // Auth.js (30 dias) isso era um mês; oito horas fecham a janela sem
    // obrigar o porteiro a voltar a autenticar-se a meio da manhã.
    maxAge: 8 * 60 * 60,
  },

  callbacks: {
    authorized({ auth, request }) {
      const autenticado = !!auth?.user;
      const caminho = request.nextUrl.pathname;

      // A página de entrada do site é pública: é o que alguém de fora vê
      // antes de ter (ou não) conta. Não redireciona quem já tem sessão —
      // pode querer voltar aqui de propósito, e o botão do cabeçalho passa
      // a apontar para o painel.
      if (caminho === "/") {
        return true;
      }

      if (caminho === "/login") {
        // Quem já tem sessão iniciada não precisa de voltar a ver o login.
        if (autenticado) {
          return Response.redirect(new URL("/painel", request.nextUrl));
        }
        return true;
      }

      // Em qualquer outra página: só passa quem tiver sessão. Devolver
      // `false` faz o Auth.js redirecionar sozinho para `pages.signIn`.
      return autenticado;
    },
  },

  // Os fornecedores reais (Credentials, Google) só existem em auth.ts.
  providers: [],
} satisfies NextAuthConfig;
