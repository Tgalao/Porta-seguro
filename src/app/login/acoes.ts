"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

/**
 * Server Action ligada ao formulário de email + palavra-passe.
 * Usa `useActionState` no lado do cliente (ver formulario-credenciais.tsx),
 * por isso recebe o estado anterior como primeiro argumento.
 */
export async function entrarComCredenciais(
  _estadoAnterior: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/painel",
    });
  } catch (erro) {
    // Quando o signIn() tem sucesso, ele próprio lança um erro especial do
    // Next.js só para desencadear o redirecionamento — esse erro TEM de
    // continuar a subir, senão a navegação para /painel nunca acontece.
    if (erro instanceof AuthError) {
      switch (erro.type) {
        case "CredentialsSignin":
          return "Email ou palavra-passe incorretos.";
        default:
          return "Não foi possível iniciar sessão. Tenta novamente.";
      }
    }
    throw erro;
  }
}

/** Server Action ligada ao botão "Entrar com conta Google". */
export async function entrarComGoogle() {
  await signIn("google", { redirectTo: "/painel" });
}
