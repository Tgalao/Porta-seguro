/**
 * Modelo: tokensQR
 *
 * Códigos QR dinâmicos gerados na área pessoal do aluno (RF15). Regras:
 *   - válido durante 2 minutos (`validoAte`);
 *   - utilização única (`usado`);
 *   - só pode existir UM código válido por aluno de cada vez — gerar um novo
 *     invalida o anterior. Essa regra é aplicada no código da Fase 5 (ao
 *     gerar um token novo, marcamos os anteriores desse aluno como usados),
 *     não pode ser garantida só pelo esquema da base de dados.
 */

import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ITokenQR {
  _id: Types.ObjectId;
  alunoId: Types.ObjectId;
  /** Código aleatório, imprevisível, gerado com `crypto.randomBytes`. */
  token: string;
  criadoEm: Date;
  validoAte: Date;
  usado: boolean;
  usadoEm?: Date;
}

const TokenQRSchema = new Schema<ITokenQR>(
  {
    alunoId: { type: Schema.Types.ObjectId, ref: "Utilizador", required: true },

    token: { type: String, required: true, unique: true },

    criadoEm: { type: Date, required: true, default: Date.now },
    validoAte: { type: Date, required: true },

    usado: { type: Boolean, default: false },
    usadoEm: { type: Date },
  },
  { timestamps: true },
);

// Ao ler um QR na portaria, procuramos sempre "o token válido deste aluno"
// — este índice composto torna essa procura imediata.
TokenQRSchema.index({ alunoId: 1, usado: 1 });

export const TokenQR: Model<ITokenQR> =
  (mongoose.models.TokenQR as Model<ITokenQR>) ||
  mongoose.model<ITokenQR>("TokenQR", TokenQRSchema, "tokensQR");
