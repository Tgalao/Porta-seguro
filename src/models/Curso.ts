/**
 * Modelo: cursos
 *
 * Um curso agrupa várias turmas (ex.: "Técnico de Programação", turmas
 * 1API, 2API, 3API). Tem um coordenador, que é um utilizador com perfil
 * "coordenador".
 */

import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ICurso {
  _id: Types.ObjectId;
  nome: string;
  sigla: string;
  anosDuracao: number;
  coordenadorId?: Types.ObjectId;
}

const CursoSchema = new Schema<ICurso>(
  {
    nome: { type: String, required: true, trim: true },

    // "API", "MEC", etc. — guardamos sempre em maiúsculas para não haver
    // duas siglas iguais escritas de forma diferente ("api" vs "API").
    sigla: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    anosDuracao: { type: Number, required: true, min: 1 },

    coordenadorId: { type: Schema.Types.ObjectId, ref: "Utilizador" },
  },
  { timestamps: true },
);

// `mongoose.models.Curso` só existe se o modelo já tiver sido criado antes.
// Isto evita o erro "Cannot overwrite model once compiled", que acontece em
// desenvolvimento porque o Next.js recarrega os módulos a cada gravação.
export const Curso: Model<ICurso> =
  (mongoose.models.Curso as Model<ICurso>) ||
  // Terceiro argumento = nome exato da coleção. Sem isto, o Mongoose tentaria
  // adivinhar o plural em inglês ("cursos" -> "cursoss"), o que está errado
  // para nomes em português.
  mongoose.model<ICurso>("Curso", CursoSchema, "cursos");
