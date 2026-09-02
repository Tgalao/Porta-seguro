/**
 * Decisão de saída (RF02): pode um aluno sair da escola agora?
 */

import type { Types } from "mongoose";
import type { IHorario } from "@/models/Horario";
import { encontrarBlocoADecorrer } from "./horarios";

/** Só os campos do aluno de que esta decisão precisa. */
export interface AlunoParaDecisaoSaida {
  maiorIdade: boolean;
  autorizacaoPais: boolean;
}

export interface DecisaoSaida {
  autorizado: boolean;
  motivo: string;
  /** Bloco de horário em vigor no momento da saída, se existir. */
  horarioId?: Types.ObjectId;
}

/**
 * A saída é autorizada se não houver nenhuma aula a decorrer nesse
 * momento, ou se o aluno for maior de idade, ou se tiver autorização dos
 * pais para sair fora do horário letivo. Caso contrário, é recusada.
 */
export function decidirSaida(
  aluno: AlunoParaDecisaoSaida,
  horariosDaTurma: IHorario[],
  momento: Date,
): DecisaoSaida {
  const bloco = encontrarBlocoADecorrer(horariosDaTurma, momento);

  if (!bloco) {
    return { autorizado: true, motivo: "Fora do horário letivo." };
  }

  if (aluno.maiorIdade) {
    return {
      autorizado: true,
      motivo: "Aluno maior de idade.",
      horarioId: bloco._id,
    };
  }

  if (aluno.autorizacaoPais) {
    return {
      autorizado: true,
      motivo: "Aluno tem autorização dos pais para sair fora do horário letivo.",
      horarioId: bloco._id,
    };
  }

  return {
    autorizado: false,
    motivo: "Dentro do horário letivo e sem autorização dos pais para sair.",
    horarioId: bloco._id,
  };
}
