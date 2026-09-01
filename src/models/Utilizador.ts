/**
 * Modelo: utilizadores
 *
 * Guarda todas as pessoas do sistema: alunos, porteiros, professores,
 * diretores de turma, coordenadores e administração. O campo `perfil`
 * distingue o tipo de utilizador; vários campos só fazem sentido para alguns
 * perfis (ex.: `numeroAluno` só existe em alunos), mas ficam todos no mesmo
 * modelo para simplificar — é a mesma pessoa que faz login.
 */

import mongoose, { Schema, type Model, type Types } from "mongoose";
import { PERFIS, type Perfil } from "@/lib/constantes";

export interface IUtilizador {
  _id: Types.ObjectId;
  nomeCompleto: string;
  email: string;
  /** Hash Argon2id da palavra-passe. Ausente se o utilizador só usar o
   * login com conta Google (ver Fase 2). */
  palavraPasse?: string;
  perfil: Perfil;
  telemovel?: string;
  /** Só para alunos. */
  numeroAluno?: number;
  /** Só para alunos — código do cartão físico lido na portaria. */
  numeroCartao?: string;
  /** Só para alunos — turma a que pertence. */
  turmaId?: Types.ObjectId;
  /** Só para alunos — verdadeiro se tiver 18 anos ou mais. */
  maiorIdade: boolean;
  /** Só para alunos — verdadeiro se os pais autorizaram a saída fora do horário. */
  autorizacaoPais: boolean;
  /** Só para alunos — impede a entrada enquanto for verdadeiro. */
  suspenso: boolean;
  /** Fotografia do aluno, mostrada na portaria para confirmar identidade. */
  fotoUrl?: string;
  /** Só para diretores de turma — turmas de que é diretor. */
  turmasQueCoordena: Types.ObjectId[];
  /** Só para coordenadores — cursos que coordena. */
  cursosQueCoordena: Types.ObjectId[];
}

const UtilizadorSchema = new Schema<IUtilizador>(
  {
    nomeCompleto: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    // `select: false`: por segurança, este campo NUNCA é devolvido numa
    // consulta normal (ex.: `Utilizador.find()`). Só aparece se pedirmos
    // explicitamente com `.select("+palavraPasse")`, o que só acontece no
    // código de autenticação (Fase 2). Assim reduzimos o risco de um dia,
    // sem querer, enviarmos o hash da password para o browser.
    palavraPasse: { type: String, select: false },

    perfil: { type: String, enum: PERFIS, required: true, default: "aluno" },

    telemovel: { type: String, trim: true },

    numeroAluno: { type: Number },

    // `unique + sparse`: garante que não há dois utilizadores com o mesmo
    // número de cartão, mas permite que muitos utilizadores (porteiro, admin,
    // professores) não tenham cartão nenhum — "sparse" ignora os documentos
    // onde o campo não existe, em vez de os tratar todos como duplicados de
    // "null".
    numeroCartao: { type: String, unique: true, sparse: true, trim: true },

    turmaId: { type: Schema.Types.ObjectId, ref: "Turma" },

    maiorIdade: { type: Boolean, default: false },
    autorizacaoPais: { type: Boolean, default: false },
    suspenso: { type: Boolean, default: false },

    fotoUrl: { type: String, trim: true },

    turmasQueCoordena: [{ type: Schema.Types.ObjectId, ref: "Turma" }],
    cursosQueCoordena: [{ type: Schema.Types.ObjectId, ref: "Curso" }],
  },
  { timestamps: true },
);

// Consultas frequentes: "todos os alunos de uma turma" (ecrã de
// administração e cálculo de assiduidade por turma).
UtilizadorSchema.index({ turmaId: 1 });

export const Utilizador: Model<IUtilizador> =
  (mongoose.models.Utilizador as Model<IUtilizador>) ||
  mongoose.model<IUtilizador>("Utilizador", UtilizadorSchema, "utilizadores");
