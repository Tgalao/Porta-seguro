/**
 * Decisão de entrada (RF03): pode um aluno entrar na escola agora?
 */

import type { Types } from "mongoose";
import type { IHorario } from "@/models/Horario";
import { encontrarBlocoADecorrer } from "./horarios";

/** Só os campos do aluno de que esta decisão precisa. */
export interface AlunoParaDecisaoEntrada {
  suspenso: boolean;
}

export interface DecisaoEntrada {
  autorizado: boolean;
  motivo: string;
  comAtraso: boolean;
  /** Bloco de horário já em curso, quando a entrada é registada com atraso. */
  horarioId?: Types.ObjectId;
  /** Verdadeiro quando esta decisão deve gerar uma ocorrência (aluno suspenso). */
  criarOcorrencia: boolean;
}

/**
 * Um aluno suspenso nunca pode entrar — a tentativa fica registada como
 * ocorrência para a administração investigar. Caso contrário a entrada é
 * sempre autorizada; só fica assinalada como atraso se já estiver a
 * decorrer uma aula da turma nesse momento.
 */
export function decidirEntrada(
  aluno: AlunoParaDecisaoEntrada,
  horariosDaTurma: IHorario[],
  momento: Date,
): DecisaoEntrada {
  if (aluno.suspenso) {
    return {
      autorizado: false,
      motivo: "Aluno suspenso.",
      comAtraso: false,
      criarOcorrencia: true,
    };
  }

  const bloco = encontrarBlocoADecorrer(horariosDaTurma, momento);

  if (!bloco) {
    return {
      autorizado: true,
      motivo: "Entrada dentro de horário.",
      comAtraso: false,
      criarOcorrencia: false,
    };
  }

  return {
    autorizado: true,
    motivo: "Entrada com atraso: já decorre uma aula da turma.",
    comAtraso: true,
    horarioId: bloco._id,
    criarOcorrencia: false,
  };
}
