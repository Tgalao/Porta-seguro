/**
 * Auxiliar partilhado por `decidirSaida` e `decidirEntrada`: descobrir se
 * há uma aula a decorrer num determinado momento.
 */

import type { IHorario } from "@/models/Horario";
import {
  diaDaSemanaEmLisboa,
  minutosDoDiaEmLisboa,
  horaParaMinutos,
} from "@/lib/datas";

/**
 * Procura, entre os horários de uma turma, o bloco de aula que está a
 * decorrer num determinado momento (hora de Lisboa).
 *
 * Convenção do início/fim: um bloco está "a decorrer" desde o minuto exato
 * de início (inclusive) até ao minuto exato de fim (exclusive). Ou seja, às
 * 10:00 uma aula que termina às 10:00 já não está a decorrer, mas uma aula
 * que começa às 10:00 já está — evita que os dois blocos consecutivos do
 * mesmo dia se considerem "a decorrer" ao mesmo tempo no minuto da troca.
 */
export function encontrarBlocoADecorrer(
  horariosDaTurma: IHorario[],
  momento: Date,
): IHorario | undefined {
  const diaSemana = diaDaSemanaEmLisboa(momento);
  const minutoAtual = minutosDoDiaEmLisboa(momento);

  return horariosDaTurma.find((bloco) => {
    if (bloco.diaSemana !== diaSemana) return false;

    const inicio = horaParaMinutos(bloco.horaInicio);
    const fim = horaParaMinutos(bloco.horaFim);
    return minutoAtual >= inicio && minutoAtual < fim;
  });
}
