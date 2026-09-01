/**
 * Modelo: registos
 *
 * O coração do sistema: cada entrada ou saída de um aluno na portaria fica
 * aqui, com a decisão que foi tomada. É a partir desta coleção (cruzada com
 * `horarios`) que se calculam presenças, faltas e atrasos — nunca se
 * introduzem esses valores à mão.
 */

import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  TIPOS_REGISTO,
  METODOS_REGISTO,
  ESTADOS_REGISTO,
  type TipoRegisto,
  type MetodoRegisto,
  type EstadoRegisto,
} from "@/lib/constantes";

export interface IRegisto {
  _id: Types.ObjectId;
  alunoId: Types.ObjectId;
  dataHora: Date;
  tipo: TipoRegisto;
  metodo: MetodoRegisto;
  estado: EstadoRegisto;
  /** Explicação da decisão (ex.: "fora do horário letivo", "aluno suspenso"). */
  motivo?: string;
  /** Bloco de horário em vigor no momento do registo, se existir. */
  horarioId?: Types.ObjectId;
  /** Utilizador (porteiro) que efetuou ou confirmou o registo. */
  registadoPorId: Types.ObjectId;
  /** Verdadeiro se o porteiro confirmou a autorização dos pais por telefone. */
  confirmacaoPais: boolean;
}

const RegistoSchema = new Schema<IRegisto>(
  {
    alunoId: { type: Schema.Types.ObjectId, ref: "Utilizador", required: true },

    dataHora: { type: Date, required: true, default: Date.now },

    tipo: { type: String, enum: TIPOS_REGISTO, required: true },
    metodo: { type: String, enum: METODOS_REGISTO, required: true },
    estado: { type: String, enum: ESTADOS_REGISTO, required: true },

    motivo: { type: String, trim: true },

    horarioId: { type: Schema.Types.ObjectId, ref: "Horario" },

    registadoPorId: {
      type: Schema.Types.ObjectId,
      ref: "Utilizador",
      required: true,
    },

    confirmacaoPais: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Índice principal: o histórico de um aluno é sempre consultado ordenado do
// mais recente para o mais antigo (`-1` na dataHora), tanto no ecrã de
// consultas como no cálculo de assiduidade.
RegistoSchema.index({ alunoId: 1, dataHora: -1 });

export const Registo: Model<IRegisto> =
  (mongoose.models.Registo as Model<IRegisto>) ||
  mongoose.model<IRegisto>("Registo", RegistoSchema, "registos");
