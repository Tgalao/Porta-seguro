import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { headers } from "next/headers";

import { authConfig } from "./auth.config";
import { autorizarCredenciais } from "@/lib/autenticacao";
import { precisaDoisFatores } from "@/lib/dois-fatores";
import { ligarBaseDados } from "@/lib/mongoose";
import { Utilizador } from "@/models";
import { notificarLogin } from "@/lib/notificacoes";
import { limitesDoDiaEmLisboa } from "@/lib/datas";
import type { Perfil } from "@/lib/constantes";

/**
 * A que horas é que esta sessão morre, além do limite geral de 8 horas.
 *
 * As contas admin e gestor são expulsas à meia-noite de Lisboa, aconteça o
 * que acontecer: são as contas com poder sobre os dados de toda a gente, e
 * uma sessão esquecida aberta num computador da escola deixa de servir a
 * partir do fim do dia em que foi aberta. Para os restantes perfis fica
 * `undefined` — vale só o `maxAge` de 8 horas do auth.config.ts.
 */
function fimDaSessao(perfil: Perfil): number | undefined {
  if (perfil !== "admin" && perfil !== "gestor") return undefined;
  return limitesDoDiaEmLisboa(new Date()).fim.getTime();
}

/** Endereço de onde veio o pedido, quando o servidor o consegue ver. */
async function ipDoPedido(): Promise<string | undefined> {
  try {
    const cabecalhos = await headers();
    return cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim();
  } catch {
    // Fora do contexto de um pedido HTTP não há cabeçalhos — o aviso sai
    // na mesma, só sem o endereço.
    return undefined;
  }
}

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
        codigo: { label: "Código de acesso", type: "text" },
      },
      authorize: (credenciais, pedido) =>
        autorizarCredenciais(
          credenciais?.email,
          credenciais?.password,
          credenciais?.codigo,
          // Só para ficar registado de onde veio uma tentativa falhada. O
          // bloqueio é sempre por conta, nunca por este endereço: além de
          // ser falsificável, bastava trocar de rede para o contornar.
          pedido.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        ),
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
        if (!existente) return false;

        // Contas com segundo fator não entram pelo Google. Não vale a pena
        // pôr um cadeado na porta se a janela ao lado fica aberta: o código
        // por email só protege alguma coisa se NÃO houver outra maneira de
        // entrar sem ele. Estas contas usam sempre email + palavra-passe +
        // código.
        if (precisaDoisFatores(existente.perfil)) return false;

        return true;
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
        token.expiraEm = fimDaSessao(user.perfil);
        await notificarLogin(
          user.name ?? user.email ?? "?",
          user.email ?? "",
          user.perfil,
          await ipDoPedido(),
        );
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
          token.expiraEm = fimDaSessao(utilizador.perfil);
          await notificarLogin(
            utilizador.nomeCompleto,
            utilizador.email,
            utilizador.perfil,
            await ipDoPedido(),
          );
        }
      }

      // Devolver `null` faz o Auth.js apagar o cookie de sessão (confirmado
      // em @auth/core/lib/actions/session.js) — é assim que a sessão do
      // admin/gestor morre à meia-noite, mesmo que o browser fique aberto.
      // Este `if` corre em TODOS os pedidos, não só no login: é o que faz o
      // prazo ser verificado a sério e não só decidido uma vez.
      if (token.expiraEm && Date.now() > token.expiraEm) {
        return null;
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
