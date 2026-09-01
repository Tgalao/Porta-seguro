/**
 * Modelo: ocorrencias
 *
 * Registo de tentativas irregulares, para auditoria (RF16): códigos QR
 * expirados, já usados ou de outro aluno, e entradas bloqueadas por
 * suspensão (RF03). Não substitui os `registos` — é um registo à parte,
 * pensado para a administração poder investigar comportamentos suspeitos.
 */

import mongoose, { Schema, type Model, type Types } from "mongoose";
import { TIPOS_OCORRENCIA, type TipoOcorrencia } from "@/lib/constantes";

export interface IOcorrencia {
  _id: Types.ObjectId;
  alunoId: Types.ObjectId;
  tipo: TipoOcorrencia;
  descricao: string;
  dataHora: Date;
  /** Registo de entrada/saída associado, quando existir. */
  registoId?: Types.ObjectId;
}

const OcorrenciaSchema = new Schema<IOcorrencia>(
  {
    alunoId: { type: Schema.Types.ObjectId, ref: "Utilizador", required: true },

    tipo: { type: String, enum: TIPOS_OCORRENCIA, required: true },

    descricao: { type: String, required: true, trim: true },

    dataHora: { type: Date, required: true, default: Date.now },

    registoId: { type: Schema.Types.ObjectId, ref: "Registo" },
  },
  { timestamps: true },
);

OcorrenciaSchema.index({ alunoId: 1, dataHora: -1 });

export const Ocorrencia: Model<IOcorrencia> =
  (mongoose.models.Ocorrencia as Model<IOcorrencia>) ||
  mongoose.model<IOcorrencia>("Ocorrencia", OcorrenciaSchema, "ocorrencias");
