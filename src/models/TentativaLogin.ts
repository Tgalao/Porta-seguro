/**
 * Modelo: tentativasLogin
 *
 * Regista cada tentativa de login FALHADA, para limitar quantas se podem
 * fazer seguidas contra a mesma conta (RNF05 — decisão do aluno, não
 * estava nos requisitos originais).
 *
 * Sem isto, nada impedia alguém de experimentar palavras-passe uma atrás
 * da outra até acertar. E como cada tentativa faz o servidor calcular um
 * hash Argon2id (que gasta 19 MiB de memória de propósito), muitas
 * tentativas ao mesmo tempo eram também uma forma de o deixar sem
 * memória — por isso a verificação do limite acontece ANTES de calcular
 * o hash.
 *
 * As tentativas apagam-se sozinhas passados 15 minutos: o índice TTL do
 * MongoDB trata disso, não é preciso limpar nada à mão nem guardar
 * histórico de tentativas para sempre.
 */

import mongoose, { Schema, type Model, type Types } from "mongoose";

/** Quantas falhas seguidas antes de bloquear, e durante quanto tempo. */
export const MAX_TENTATIVAS = 5;
export const JANELA_MINUTOS = 15;

export interface ITentativaLogin {
  _id: Types.ObjectId;
  /** Email tentado, em minúsculas — a chave do bloqueio. */
  email: string;
  /** Endereço de onde veio a tentativa, quando o servidor o consegue ver.
   * Guardado só para se perceber depois de onde partiu um ataque; o
   * bloqueio é por conta, não por endereço (senão bastava trocar de rede
   * para continuar a tentar). */
  ip?: string;
  quando: Date;
}

const TentativaLoginSchema = new Schema<ITentativaLogin>({
  email: { type: String, required: true, lowercase: true, trim: true },
  ip: { type: String },
  quando: { type: Date, required: true, default: Date.now },
});

// Procura frequente: "quantas falhas teve esta conta nos últimos minutos".
TentativaLoginSchema.index({ email: 1, quando: -1 });

// `expireAfterSeconds`: o MongoDB apaga sozinho cada tentativa quando ela
// passa a janela de bloqueio — é o que faz o bloqueio ser temporário.
TentativaLoginSchema.index({ quando: 1 }, { expireAfterSeconds: JANELA_MINUTOS * 60 });

export const TentativaLogin: Model<ITentativaLogin> =
  (mongoose.models.TentativaLogin as Model<ITentativaLogin>) ||
  mongoose.model<ITentativaLogin>("TentativaLogin", TentativaLoginSchema, "tentativasLogin");
