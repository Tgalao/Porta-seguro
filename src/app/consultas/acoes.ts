"use server";

import { exigirPerfil } from "@/lib/permissoes";
import { calcularResultadoConsulta, type Ambito, type ResultadoConsulta } from "./logica";

/**
 * UC02 — Consultar assiduidade. Aberto a porteiro e admin (tal como o
 * caso de uso descreve: "Administração (ou porteiro)").
 */
export async function consultarAssiduidade(
  ambito: Ambito,
  alvo: string,
  mes: string,
): Promise<ResultadoConsulta> {
  await exigirPerfil(["porteiro", "admin"]);

  if (!alvo) {
    return { ok: false, erro: "Escolhe um aluno, turma ou ano de formação." };
  }
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    return { ok: false, erro: "Escolhe um mês válido." };
  }

  return calcularResultadoConsulta(ambito, alvo, mes);
}
