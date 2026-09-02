/**
 * Cálculo de presenças, faltas e atrasos (RF05). Função pura — sem BD, sem
 * rede — tal como as regras de decisão da Fase 3: recebe os horários da
 * turma e os registos já lidos da base de dados, e devolve os números.
 * Presenças/faltas/atrasos NUNCA são guardados à parte — são sempre
 * recalculados a partir de `horarios` + `registos`.
 */

import type { Types } from "mongoose";
import { diaDaSemanaEmLisboa, limitesDoDiaEmLisboa } from "@/lib/datas";
import type { TipoRegisto, EstadoRegisto } from "@/lib/constantes";

export interface RegistoParaAssiduidade {
  tipo: TipoRegisto;
  estado: EstadoRegisto;
  dataHora: Date;
  /** Presente só quando a entrada foi registada com uma aula já a decorrer. */
  horarioId?: Types.ObjectId | string;
}

export type SituacaoDia = "presenca" | "presenca_atraso" | "falta";

export interface DiaAssiduidade {
  /** Meia-noite (Lisboa) desse dia, em UTC. */
  data: Date;
  situacao: SituacaoDia;
}

export interface ResultadoAssiduidade {
  diasLetivos: number;
  presencas: number;
  atrasos: number;
  faltas: number;
  /** Entre 0 e 1 — 0 quando não há nenhum dia letivo no período. */
  taxaPresenca: number;
  dias: DiaAssiduidade[];
}

/**
 * Um dia conta como "letivo" para a turma se houver pelo menos um bloco de
 * horário nesse dia da semana — não interessa se é feriado ou não, porque
 * o sistema não tem calendário escolar (fora do âmbito do projeto).
 *
 * Um dia conta como "presença" se houver uma entrada autorizada nesse dia;
 * "com atraso" se essa entrada tiver `horarioId` (só fica preenchido pela
 * Fase 3 quando já decorria uma aula no momento da entrada — ver
 * `decidirEntrada`). Sem entrada autorizada nesse dia, é falta — inclui o
 * caso de a entrada ter sido bloqueada por suspensão.
 */
export function calcularAssiduidade(
  horariosDaTurma: Array<{ diaSemana: number }>,
  registosDoAluno: RegistoParaAssiduidade[],
  periodo: { inicio: Date; fim: Date },
): ResultadoAssiduidade {
  const diasComAula = new Set(horariosDaTurma.map((h) => h.diaSemana));
  const dias: DiaAssiduidade[] = [];

  // Avança dia a dia recalculando sempre os limites em Lisboa (em vez de
  // somar 24h fixas), para não desacertar nos dias de mudança de hora.
  let cursor = limitesDoDiaEmLisboa(periodo.inicio).inicio;

  while (cursor < periodo.fim) {
    const { inicio: inicioDoDia, fim: fimDoDia } = limitesDoDiaEmLisboa(cursor);

    if (diasComAula.has(diaDaSemanaEmLisboa(cursor))) {
      const entradaDoDia = registosDoAluno.find(
        (registo) =>
          registo.tipo === "entrada" &&
          registo.estado === "autorizado" &&
          registo.dataHora >= inicioDoDia &&
          registo.dataHora < fimDoDia,
      );

      const situacao: SituacaoDia = !entradaDoDia
        ? "falta"
        : entradaDoDia.horarioId
          ? "presenca_atraso"
          : "presenca";

      dias.push({ data: inicioDoDia, situacao });
    }

    cursor = fimDoDia;
  }

  const diasLetivos = dias.length;
  const atrasos = dias.filter((d) => d.situacao === "presenca_atraso").length;
  const faltas = dias.filter((d) => d.situacao === "falta").length;
  const presencas = diasLetivos - faltas;
  const taxaPresenca = diasLetivos === 0 ? 0 : presencas / diasLetivos;

  return { diasLetivos, presencas, atrasos, faltas, taxaPresenca, dias };
}
