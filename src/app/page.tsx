import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * A raiz do site nunca mostra conteúdo próprio: manda logo para o painel
 * (se já houver sessão) ou para o login (caso contrário).
 */
export default async function PaginaInicial() {
  const sessao = await auth();
  redirect(sessao?.user ? "/painel" : "/login");
}
