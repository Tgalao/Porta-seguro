/**
 * Modelo: codigosVerificacao
 *
 * Guarda o código de 6 dígitos que as contas admin e gestor recebem por
 * email para completar o login (segundo fator — decisão do aluno, não
 * estava nos requisitos originais).
 *
 * Porquê só estas duas contas? São as únicas que conseguem mudar
 * palavras-passe de outras pessoas e ver os dados de todos os alunos. Se
 * uma delas for comprometida, cai tudo — as restantes têm poder limitado
 * ao seu âmbito.
 *
 * O código NUNCA é guardado em texto simples: fica o hash Argon2id, o
 * mesmo tratamento das palavras-passe. São só 6 dígitos, ou seja um
 * milhão de hipóteses — pouco para aguentar um ataque offline se a base
 * de dados fosse copiada, mas o que trava mesmo o ataque é o resto: o
 * código morre ao fim de 10 minutos, só serve uma vez, e são no máximo 3
 * tentativas.
 */

import mongoose, { Schema, type Model, type Types } from "mongoose";

/** Quanto tempo o código serve, e quantas tentativas dá para errar. */
export const VALIDADE_CODIGO_MINUTOS = 10;
export const MAX_TENTATIVAS_CODIGO = 3;

export interface ICodigoVerificacao {
  _id: Types.ObjectId;
  /** Email da conta a que este código pertence, em minúsculas. */
  email: string;
  /** Hash Argon2id do código — nunca o código em si. */
  hash: string;
  /** Quantas vezes já foi tentado um código errado para esta entrada. */
  tentativas: number;
  criadoEm: Date;
}

const CodigoVerificacaoSchema = new Schema<ICodigoVerificacao>({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  hash: { type: String, required: true },
  tentativas: { type: Number, required: true, default: 0 },
  criadoEm: { type: Date, required: true, default: Date.now },
});

// O MongoDB apaga sozinho os códigos expirados — não é preciso limpar nada
// à mão, e um código velho nunca fica por aí a poder ser usado.
CodigoVerificacaoSchema.index(
  { criadoEm: 1 },
  { expireAfterSeconds: VALIDADE_CODIGO_MINUTOS * 60 },
);

export const CodigoVerificacao: Model<ICodigoVerificacao> =
  (mongoose.models.CodigoVerificacao as Model<ICodigoVerificacao>) ||
  mongoose.model<ICodigoVerificacao>(
    "CodigoVerificacao",
    CodigoVerificacaoSchema,
    "codigosVerificacao",
  );
