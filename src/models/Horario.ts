/**
 * Modelo: horarios
 *
 * Um bloco de aula de uma turma: dia da semana + hora de início + hora de
 * fim. É com base nestes blocos que o sistema decide se uma saída está
 * dentro do horário letivo e se uma entrada é um atraso (Fase 3).
 */

import mongoose, { Schema, type Model, type Types } from "mongoose";

// Formato "HH:MM", com horas de 00 a 23 e minutos de 00 a 59.
const REGEX_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface IHorario {
  _id: Types.ObjectId;
  turmaId: Types.ObjectId;
  /** 0 = domingo, 1 = segunda, ... 6 = sábado (mesma convenção do JavaScript). */
  diaSemana: number;
  /** Hora de início, formato "HH:MM". */
  horaInicio: string;
  /** Hora de fim, formato "HH:MM". */
  horaFim: string;
  disciplina: string;
  professorId?: Types.ObjectId;
  sala?: string;
}

const HorarioSchema = new Schema<IHorario>(
  {
    turmaId: { type: Schema.Types.ObjectId, ref: "Turma", required: true },

    diaSemana: { type: Number, required: true, min: 0, max: 6 },

    horaInicio: {
      type: String,
      required: true,
      match: [REGEX_HORA, 'A hora de início tem de estar no formato "HH:MM".'],
    },

    horaFim: {
      type: String,
      required: true,
      match: [REGEX_HORA, 'A hora de fim tem de estar no formato "HH:MM".'],
    },

    disciplina: { type: String, required: true, trim: true },

    professorId: { type: Schema.Types.ObjectId, ref: "Utilizador" },

    sala: { type: String, trim: true },
  },
  { timestamps: true },
);

// Validação que compara dois campos entre si (horaFim depois de horaInicio):
// usa-se um "hook" em vez de `validate` no campo, porque o Mongoose só nos dá
// acesso ao documento completo (para ler `this.horaInicio`) neste ponto.
// Comparamos as strings "HH:MM" diretamente: com zeros à esquerda, a ordem
// alfabética coincide sempre com a ordem cronológica.
HorarioSchema.pre("validate", function () {
  if (this.horaFim <= this.horaInicio) {
    throw new Error("A hora de fim tem de ser depois da hora de início.");
  }
});

// Índice principal deste modelo: a Fase 3 vai perguntar constantemente
// "que blocos tem esta turma neste dia da semana?" — este índice composto
// torna essa consulta imediata mesmo com muitos horários na base de dados.
HorarioSchema.index({ turmaId: 1, diaSemana: 1 });

export const Horario: Model<IHorario> =
  (mongoose.models.Horario as Model<IHorario>) ||
  mongoose.model<IHorario>("Horario", HorarioSchema, "horarios");
