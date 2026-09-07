/**
 * Estado da porta para uma pessoa, num dado momento, a partir do horário
 * da turma dela. Função pura — sem BD, sem rede — como as restantes regras
 * da Fase 3.
 *
 * Serve o ecrã da portaria: depois de identificar o aluno (cartão ou QR), o
 * porteiro precisa de perceber num relance se aquela pessoa devia mesmo
 * estar ali àquela hora. Não tem nada a ver com assiduidade — isso é
 * histórico, e o porteiro não tem acesso a esses dados.
 */

import type { IHorario } from "@/models/Horario";
import { diaDaSemanaEmLisboa, minutosDoDiaEmLisboa, horaParaMinutos } from "@/lib/datas";
import { encontrarBlocoADecorrer } from "./horarios";

export type EstadoPorta = "aberta" | "fechada";

export interface ResultadoEstadoPorta {
  estado: EstadoPorta;
  /** Frase curta para o porteiro ler de imediato. */
  motivo: string;
  /**
   * Verdadeiro quando a leitura acontece com uma aula já a decorrer — ou
   * seja, a pessoa devia já cá estar e só chegou agora.
   */
  atrasado: boolean;
}

/**
 * Regra, por ordem:
 *
 *  1. Sem blocos hoje  -> porta fechada (a pessoa não tem aulas hoje).
 *  2. Aula a decorrer  -> porta aberta, mas marcada como ATRASO: se a aula
 *     já começou e a pessoa só está a entrar agora, chegou tarde.
 *  3. Antes da 1.ª aula do dia -> porta aberta, ainda a horas.
 *  4. Entre blocos (intervalo) -> porta aberta.
 *  5. Depois do último bloco -> porta fechada, as aulas já acabaram.
 */
export function calcularEstadoPorta(
  horariosDaTurma: IHorario[],
  momento: Date,
): ResultadoEstadoPorta {
  const diaSemana = diaDaSemanaEmLisboa(momento);
  const blocosDeHoje = horariosDaTurma.filter((bloco) => bloco.diaSemana === diaSemana);

  if (blocosDeHoje.length === 0) {
    return {
      estado: "fechada",
      motivo: "Não há aulas para esta turma hoje.",
      atrasado: false,
    };
  }

  const blocoAtual = encontrarBlocoADecorrer(horariosDaTurma, momento);
  if (blocoAtual) {
    return {
      estado: "aberta",
      motivo: `Aula a decorrer: ${blocoAtual.disciplina} (${blocoAtual.horaInicio}–${blocoAtual.horaFim}). Chegou depois da hora de entrada.`,
      atrasado: true,
    };
  }

  const minutoAtual = minutosDoDiaEmLisboa(momento);
  const primeiroInicio = Math.min(...blocosDeHoje.map((b) => horaParaMinutos(b.horaInicio)));
  const ultimoFim = Math.max(...blocosDeHoje.map((b) => horaParaMinutos(b.horaFim)));

  if (minutoAtual < primeiroInicio) {
    const primeiroBloco = blocosDeHoje.find(
      (b) => horaParaMinutos(b.horaInicio) === primeiroInicio,
    );
    return {
      estado: "aberta",
      motivo: `Ainda a horas — as aulas começam às ${primeiroBloco?.horaInicio}.`,
      atrasado: false,
    };
  }

  if (minutoAtual >= ultimoFim) {
    return {
      estado: "fechada",
      motivo: "As aulas de hoje já terminaram.",
      atrasado: false,
    };
  }

  return {
    estado: "aberta",
    motivo: "Intervalo entre aulas.",
    atrasado: false,
  };
}
