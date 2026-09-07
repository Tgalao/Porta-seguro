/**
 * Que turmas é que cada perfil pode consultar.
 *
 * Existe num sítio só porque é usado em dois lados (horários e
 * assiduidade) e porque a verificação TEM de acontecer no servidor: filtrar
 * apenas as opções de um menu não impede ninguém de enviar diretamente o id
 * de outra turma para a Server Action.
 */

import type { Types } from "mongoose";
import { ligarBaseDados } from "@/lib/mongoose";
import { Turma, Horario, Utilizador } from "@/models";
import type { Perfil } from "@/lib/constantes";

export interface TurmaDoAmbito {
  id: string;
  nome: string;
  ano: number;
}

/**
 * Devolve as turmas que este utilizador pode ver:
 *
 *  - admin        -> a escola toda;
 *  - coordenador  -> as turmas dos cursos que coordena;
 *  - professor/dt -> as turmas onde tem blocos de horário atribuídos, mais
 *                    as turmas de que é diretor;
 *  - qualquer outro perfil (aluno, porteiro) -> nenhuma. O aluno vê o seu
 *    próprio horário pela área pessoal, e o porteiro não consulta turmas.
 */
export async function turmasDoUtilizador(
  idUtilizador: string,
  perfil: Perfil,
): Promise<TurmaDoAmbito[]> {
  await ligarBaseDados();

  if (perfil === "admin") {
    const todas = await Turma.find().select("nome ano").sort({ nome: 1 }).lean();
    return todas.map(paraTurmaDoAmbito);
  }

  if (perfil === "coordenador") {
    const utilizador = await Utilizador.findById(idUtilizador).select("cursosQueCoordena").lean();
    const cursos = utilizador?.cursosQueCoordena ?? [];
    if (cursos.length === 0) return [];

    const turmas = await Turma.find({ cursoId: { $in: cursos } })
      .select("nome ano")
      .sort({ nome: 1 })
      .lean();
    return turmas.map(paraTurmaDoAmbito);
  }

  if (perfil === "professor" || perfil === "dt") {
    const [blocos, utilizador] = await Promise.all([
      Horario.find({ professorId: idUtilizador }).select("turmaId").lean(),
      Utilizador.findById(idUtilizador).select("turmasQueCoordena").lean(),
    ]);

    // Um Set evita repetidos: um professor tem normalmente vários blocos na
    // mesma turma, e um diretor de turma também lá dá aulas.
    const ids = new Set<string>(blocos.map((bloco) => bloco.turmaId.toString()));
    for (const turmaId of utilizador?.turmasQueCoordena ?? []) {
      ids.add(turmaId.toString());
    }
    if (ids.size === 0) return [];

    const turmas = await Turma.find({ _id: { $in: [...ids] } })
      .select("nome ano")
      .sort({ nome: 1 })
      .lean();
    return turmas.map(paraTurmaDoAmbito);
  }

  return [];
}

function paraTurmaDoAmbito(turma: { _id: Types.ObjectId; nome: string; ano: number }): TurmaDoAmbito {
  return { id: turma._id.toString(), nome: turma.nome, ano: turma.ano };
}
