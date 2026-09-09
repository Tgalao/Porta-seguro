"use server";

import { exigirPerfil } from "@/lib/permissoes";
import {
  calcularResultadoConsulta,
  podeConsultar,
  type Ambito,
  type ResultadoConsulta,
} from "./logica";

/**
 * UC02 — Consultar assiduidade.
 *
 * Só admin e coordenador. O porteiro NÃO entra aqui: a função dele é
 * identificar quem passa na portaria, não acompanhar o histórico de faltas
 * de ninguém. O coordenador só vê as turmas dos cursos que coordena, e essa
 * verificação é feita aqui no servidor — não basta filtrar os menus, porque
 * o id da turma vem do browser e podia ser trocado à mão.
 */
export async function consultarAssiduidade(
  ambito: Ambito,
  alvo: string,
  mes: string,
): Promise<ResultadoConsulta> {
  const sessao = await exigirPerfil(["coordenador", "gestor", "admin"]);

  if (!alvo) {
    return { ok: false, erro: "Escolhe um aluno, turma ou ano de formação." };
  }
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    return { ok: false, erro: "Escolhe um mês válido." };
  }

  if (!(await podeConsultar(sessao.user.id, sessao.user.perfil, ambito, alvo))) {
    return { ok: false, erro: "Não tens acesso a esses dados." };
  }

  return calcularResultadoConsulta(ambito, alvo, mes);
}
