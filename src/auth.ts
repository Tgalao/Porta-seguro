import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { authConfig } from "./auth.config";
import { autorizarCredenciais } from "@/lib/autenticacao";
import { ligarBaseDados } from "@/lib/mongoose";
import { Utilizador } from "@/models";
import { notificarLogin } from "@/lib/notificacoes";

/**
 * Configuração completa do Auth.js, com os dois fornecedores de login
 * (RF13): email + palavra-passe, e conta Google. Só é importado por código
 * que corre no runtime Node.js (rotas de API, Server Components, Server
 * Actions) — nunca pelo middleware.ts (ver a explicação em auth.config.ts).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Palavra-passe", type: "password" },
      },
      authorize: (credenciais) =>
        autorizarCredenciais(credenciais?.email, credenciais?.password),
    }),

    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Sem isto, o Google entra logo com a conta já sessão aberta no
      // telemóvel/browser, sem perguntar qual usar — más notícias quando é
      // um telemóvel partilhado ou com várias contas Google. `select_account`
      // obriga a mostrar sempre o ecrã de escolha de conta.
      authorization: { params: { prompt: "select_account" } },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    // Só entra por conta Google quem já tem uma conta criada na escola. O
    // Google só confirma "esta pessoa é dona deste email" — não decide se
    // essa pessoa pode usar o PortãoSeguro. Essa decisão é sempre nossa.
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await ligarBaseDados();
        const existente = await Utilizador.findOne({
          email: user.email?.toLowerCase(),
        });
        return existente !== null;
      }
      return true;
    },

    // Só corre quando alguém acaba de fazer login (`user` só vem preenchido
    // nesse momento). Nos pedidos seguintes, o Auth.js reaproveita o token
    // já guardado, sem voltar a consultar a base de dados.
    async jwt({ token, user }) {
      if (user?.perfil) {
        // Veio do fornecedor Credentials — autorizarCredenciais() já foi à
        // base de dados e confirmou tudo.
        token.idUtilizador = user.id;
        token.perfil = user.perfil;
        await notificarLogin(user.name ?? user.email ?? "?", user.email ?? "", user.perfil);
      } else if (user?.email) {
        // Veio do fornecedor Google — o perfil de acesso vem sempre da
        // NOSSA base de dados (o Google não sabe se a pessoa é porteiro,
        // professor ou admin).
        await ligarBaseDados();
        const utilizador = await Utilizador.findOne({
          email: user.email.toLowerCase(),
        });
        if (utilizador) {
          token.idUtilizador = utilizador._id.toString();
          token.perfil = utilizador.perfil;
          token.name = utilizador.nomeCompleto;
          await notificarLogin(utilizador.nomeCompleto, utilizador.email, utilizador.perfil);
        }
      }
      return token;
    },

    // A sessão é o que o resto da aplicação lê com `auth()` — aqui
    // copiamos do token só o que interessa mostrar/usar no código.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.idUtilizador ?? "";
        // Se por algum motivo o perfil não ficou no token, assumimos o
        // perfil de menos permissões ("aluno") em vez de deixar undefined
        // — mais vale falhar a fechado (acesso a menos) do que a aberto.
        session.user.perfil = token.perfil ?? "aluno";
      }
      return session;
    },
  },
});
