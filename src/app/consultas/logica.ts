/**
 * Consulta de assiduidade (RF05-RF07, RF12): agrega `calcularAssiduidade`
 * (Fase 3/7, pura) com os dados da base de dados. Fica num ficheiro à
 * parte de `acoes.ts` (que só faz "use server") para poder ser importado
 * também pela rota do PDF (`/api/relatorios/pdf`), sem duplicar a consulta.
 */

import { ligarBaseDados } from "@/lib/mongoose";
import { Utilizador, Turma, Registo, Horario } from "@/models";
import { turmasDoUtilizador } from "@/lib/ambito";
import { limitesDoMesEmLisboa, formatarData } from "@/lib/datas";
import type { Perfil } from "@/lib/constantes";
import {
  calcularAssiduidade,
  type RegistoParaAssiduidade,
  type SituacaoDia,
} from "@/lib/relatorios/calcularAssiduidade";

export type Ambito = "aluno" | "turma" | "ano";

/**
 * Confirma que o alvo pedido está dentro do âmbito de quem pergunta.
 *
 * Vive aqui (e não em `acoes.ts`) porque um ficheiro "use server" transforma
 * cada função exportada numa Server Action chamável a partir do browser — e
 * uma verificação de permissões não tem nada que estar exposta assim.
 */
export async function podeConsultar(
  idUtilizador: string,
  perfil: Perfil,
  ambito: Ambito,
  alvo: string,
): Promise<boolean> {
  if (perfil === "admin") return true;

  const turmas = await turmasDoUtilizador(idUtilizador, perfil);

  if (ambito === "turma") {
    return turmas.some((turma) => turma.id === alvo);
  }

  if (ambito === "ano") {
    return turmas.some((turma) => String(turma.ano) === alvo);
  }

  // Âmbito "aluno": só se o aluno estiver numa das turmas do coordenador.
  await ligarBaseDados();
  const aluno = await Utilizador.findOne({ _id: alvo, perfil: "aluno" })
    .select("turmaId")
    .lean();
  if (!aluno?.turmaId) return false;

  const idTurmaDoAluno = aluno.turmaId.toString();
  return turmas.some((turma) => turma.id === idTurmaDoAluno);
}

export interface ResumoAssiduidade {
  diasLetivos: number;
  presencas: number;
  atrasos: number;
  faltas: number;
  taxaPresenca: number;
}

export interface LinhaDiaAssiduidade {
  dataFormatada: string;
  situacao: SituacaoDia;
}

export interface LinhaAlunoAssiduidade {
  alunoId: string;
  nome: string;
  turma?: string;
  resumo: ResumoAssiduidade;
}

export type ResultadoConsulta =
  | { ok: false; erro: string }
  | {
      ok: true;
      ambito: "aluno";
      alvoNome: string;
      resumo: ResumoAssiduidade;
      dias: LinhaDiaAssiduidade[];
    }
  | {
      ok: true;
      ambito: "turma" | "ano";
      alvoNome: string;
      resumo: ResumoAssiduidade;
      alunos: LinhaAlunoAssiduidade[];
    };

function paraResumo(resultado: ReturnType<typeof calcularAssiduidade>): ResumoAssiduidade {
  return {
    diasLetivos: resultado.diasLetivos,
    presencas: resultado.presencas,
    atrasos: resultado.atrasos,
    faltas: resultado.faltas,
    taxaPresenca: resultado.taxaPresenca,
  };
}

/** `mes` no formato "AAAA-MM" (o que um `<input type="month">` devolve). */
export async function calcularResultadoConsulta(
  ambito: Ambito,
  alvo: string,
  mes: string,
): Promise<ResultadoConsulta> {
  await ligarBaseDados();

  const [anoTexto, mesTexto] = mes.split("-");
  const periodo = limitesDoMesEmLisboa(Number(anoTexto), Number(mesTexto));

  if (ambito === "aluno") {
    const aluno = await Utilizador.findOne({ _id: alvo, perfil: "aluno" }).lean();
    if (!aluno) return { ok: false, erro: "Aluno não encontrado." };

    const turma = aluno.turmaId ? await Turma.findById(aluno.turmaId).lean() : null;
    const horarios = aluno.turmaId
      ? await Horario.find({ turmaId: aluno.turmaId }).select("diaSemana").lean()
      : [];
    const registos = await Registo.find({
      alunoId: aluno._id,
      dataHora: { $gte: periodo.inicio, $lt: periodo.fim },
    })
      .select("tipo estado dataHora horarioId")
      .lean();

    const resultado = calcularAssiduidade(
      horarios,
      registos as RegistoParaAssiduidade[],
      periodo,
    );

    return {
      ok: true,
      ambito: "aluno",
      alvoNome: turma ? `${aluno.nomeCompleto} — ${turma.nome}` : aluno.nomeCompleto,
      resumo: paraResumo(resultado),
      dias: resultado.dias.map((dia) => ({
        dataFormatada: formatarData(dia.data),
        situacao: dia.situacao,
      })),
    };
  }

  // "turma" ou "ano": junta uma ou várias turmas e agrega por aluno.
  let turmasRelevantes;
  let alvoNome: string;

  if (ambito === "turma") {
    const turma = await Turma.findById(alvo).lean();
    if (!turma) return { ok: false, erro: "Turma não encontrada." };
    turmasRelevantes = [turma];
    alvoNome = turma.nome;
  } else {
    const ano = Number(alvo);
    turmasRelevantes = await Turma.find({ ano }).lean();
    alvoNome = `${ano}º ano`;
  }

  if (turmasRelevantes.length === 0) {
    return { ok: true, ambito, alvoNome, resumo: paraResumo(calcularAssiduidade([], [], periodo)), alunos: [] };
  }

  const turmaIds = turmasRelevantes.map((turma) => turma._id);
  const alunos = await Utilizador.find({ turmaId: { $in: turmaIds }, perfil: "aluno" })
    .select("nomeCompleto turmaId")
    .lean();

  const horariosPorTurma = new Map<string, Array<{ diaSemana: number }>>();
  const nomeTurmaPorId = new Map<string, string>();
  for (const turma of turmasRelevantes) {
    const chave = turma._id.toString();
    nomeTurmaPorId.set(chave, turma.nome);
    horariosPorTurma.set(
      chave,
      await Horario.find({ turmaId: turma._id }).select("diaSemana").lean(),
    );
  }

  const registosTodos = await Registo.find({
    alunoId: { $in: alunos.map((aluno) => aluno._id) },
    dataHora: { $gte: periodo.inicio, $lt: periodo.fim },
  })
    .select("alunoId tipo estado dataHora horarioId")
    .lean();

  const registosPorAluno = new Map<string, RegistoParaAssiduidade[]>();
  for (const registo of registosTodos) {
    const chave = registo.alunoId.toString();
    const lista = registosPorAluno.get(chave) ?? [];
    lista.push(registo);
    registosPorAluno.set(chave, lista);
  }

  const linhasAlunos: LinhaAlunoAssiduidade[] = [];
  let totalDiasLetivos = 0;
  let totalPresencas = 0;
  let totalAtrasos = 0;
  let totalFaltas = 0;

  for (const aluno of alunos) {
    const chaveTurma = aluno.turmaId?.toString() ?? "";
    const horarios = horariosPorTurma.get(chaveTurma) ?? [];
    const registosDoAluno = registosPorAluno.get(aluno._id.toString()) ?? [];
    const resultado = calcularAssiduidade(horarios, registosDoAluno, periodo);

    linhasAlunos.push({
      alunoId: aluno._id.toString(),
      nome: aluno.nomeCompleto,
      turma: nomeTurmaPorId.get(chaveTurma),
      resumo: paraResumo(resultado),
    });

    totalDiasLetivos += resultado.diasLetivos;
    totalPresencas += resultado.presencas;
    totalAtrasos += resultado.atrasos;
    totalFaltas += resultado.faltas;
  }

  linhasAlunos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-PT"));

  return {
    ok: true,
    ambito,
    alvoNome,
    resumo: {
      diasLetivos: totalDiasLetivos,
      presencas: totalPresencas,
      atrasos: totalAtrasos,
      faltas: totalFaltas,
      taxaPresenca: totalDiasLetivos === 0 ? 0 : totalPresencas / totalDiasLetivos,
    },
    alunos: linhasAlunos,
  };
}
