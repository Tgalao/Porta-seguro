"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { verificarCredenciais } from "@/lib/autenticacao";
import { precisaDoisFatores, enviarNovoCodigo } from "@/lib/dois-fatores";

/**
 * O ecrã de login tem dois passos possíveis. As contas normais entram logo
 * no primeiro; as contas admin e gestor passam ao segundo, onde escrevem o
 * código de 6 dígitos que lhes foi enviado por email.
 */
export type EstadoLogin = {
  passo: "credenciais" | "codigo";
  erro?: string;
  aviso?: string;
};

/**
 * Server Action ligada ao formulário de email + palavra-passe.
 * Usa `useActionState` no lado do cliente (ver formulario-credenciais.tsx),
 * por isso recebe o estado anterior como primeiro argumento.
 */
export async function entrarComCredenciais(
  _estadoAnterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = formData.get("email");
  const password = formData.get("password");
  const codigo = String(formData.get("codigo") ?? "").trim();

  // Primeiro passo: ainda não há código escrito. Confirma-se a
  // palavra-passe para saber se esta conta precisa de segundo fator — e,
  // já agora, para não deixar qualquer pessoa fazer o sistema enviar
  // emails para contas que não são suas.
  if (!codigo) {
    const utilizador = await verificarCredenciais(email, password);
    if (!utilizador) {
      return { passo: "credenciais", erro: "Email ou palavra-passe incorretos." };
    }

    if (precisaDoisFatores(utilizador.perfil)) {
      const enviado = await enviarNovoCodigo(utilizador.name, utilizador.email);
      if (!enviado) {
        // Falha fechada de propósito: se o código não sai, ninguém entra.
        // Deixar passar sem ele anulava o segundo fator exatamente no
        // momento em que ele mais faz falta.
        return {
          passo: "credenciais",
          erro: "Não foi possível enviar o código de acesso. Tenta novamente daqui a pouco.",
        };
      }
      return {
        passo: "codigo",
        aviso: "Enviámos um código de 6 dígitos para o email desta conta. Escreve-o aqui.",
      };
    }
  }

  try {
    await signIn("credentials", { email, password, codigo, redirectTo: "/painel" });
  } catch (erro) {
    // Quando o signIn() tem sucesso, ele próprio lança um erro especial do
    // Next.js só para desencadear o redirecionamento — esse erro TEM de
    // continuar a subir, senão a navegação para /painel nunca acontece.
    if (erro instanceof AuthError) {
      const passo = codigo ? "codigo" : "credenciais";
      switch (erro.type) {
        case "CredentialsSignin":
          return {
            passo,
            erro: codigo
              ? "Código incorreto ou expirado. Volta a tentar o login para receberes outro."
              : "Email ou palavra-passe incorretos.",
          };
        default:
          return { passo, erro: "Não foi possível iniciar sessão. Tenta novamente." };
      }
    }
    throw erro;
  }

  return { passo: "credenciais" };
}

/** Server Action ligada ao botão "Entrar com conta Google". */
export async function entrarComGoogle() {
  await signIn("google", { redirectTo: "/painel" });
}
