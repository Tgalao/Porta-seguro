/**
 * Modelo: turmas
 *
 * Uma turma pertence a um curso e tem um diretor de turma (um utilizador
 * com perfil "dt"). Os alunos apontam para a turma através do campo
 * `turmaId` no modelo Utilizador.
 */

import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ITurma {
  _id: Types.ObjectId;
  nome: string;
  ano: number;
  cursoId: Types.ObjectId;
  diretorTurmaId?: Types.ObjectId;
}

const TurmaSchema = new Schema<ITurma>(
  {
    // Ex.: "3API" — o nome completo da turma tal como é conhecido na escola.
    nome: { type: String, required: true, trim: true },

    // Ano de formação (1, 2 ou 3, no caso de um curso profissional de 3 anos).
    ano: { type: Number, required: true, min: 1 },

    cursoId: { type: Schema.Types.ObjectId, ref: "Curso", required: true },

    diretorTurmaId: { type: Schema.Types.ObjectId, ref: "Utilizador" },
  },
  { timestamps: true },
);

// Cada curso tem várias turmas; esta consulta ("todas as turmas de um curso")
// vai ser usada nos relatórios por curso, por isso vale a pena um índice.
TurmaSchema.index({ cursoId: 1 });

export const Turma: Model<ITurma> =
  (mongoose.models.Turma as Model<ITurma>) ||
  mongoose.model<ITurma>("Turma", TurmaSchema, "turmas");
