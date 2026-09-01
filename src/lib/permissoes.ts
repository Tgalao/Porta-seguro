/**
 * Helpers de autorização para usar DENTRO de páginas, Server Actions e rotas
 * de API — complementam o middleware, que só verifica se há sessão iniciada,
 * mas não sabe quais páginas exigem quais perfis (essa regra pertence a
 * cada funcionalidade, não ao middleware genérico).
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Perfil } from "@/lib/constantes";

/** Garante que há sessão iniciada; caso contrário, manda para o login. */
export async function exigirSessao() {
  const sessao = await auth();
  if (!sessao?.user) {
    redirect("/login");
  }
  return sessao;
}

/**
 * Garante sessão iniciada E que o perfil da pessoa está entre os permitidos.
 *
 * Exemplo de uso (Fase 4, ecrã da portaria):
 *   const sessao = await exigirPerfil(["porteiro", "admin"]);
 */
export async function exigirPerfil(perfisPermitidos: Perfil[]) {
  const sessao = await exigirSessao();
  if (!perfisPermitidos.includes(sessao.user.perfil)) {
    redirect("/painel?erro=sem-permissao");
  }
  return sessao;
}
