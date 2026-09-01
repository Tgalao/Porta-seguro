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
  },

  callbacks: {
    authorized({ auth, request }) {
      const autenticado = !!auth?.user;
      const naPaginaDeLogin = request.nextUrl.pathname === "/login";

      if (naPaginaDeLogin) {
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
