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
import { TIPOS_REGISTO, type TipoRegisto } from "@/lib/constantes";

export interface ITokenQR {
  _id: Types.ObjectId;
  alunoId: Types.ObjectId;
  /** Código aleatório, imprevisível, gerado com `crypto.randomBytes`. */
  token: string;
  criadoEm: Date;
  validoAte: Date;
  usado: boolean;
  usadoEm?: Date;
  /**
   * Direção com que o código foi gerado — decidida no momento da geração
   * pela mesma regra de alternância usada na portaria (`proximoTipoRegisto`)
   * e depois EXIGIDA na leitura: um código gerado para entrar nunca serve
   * para sair, e vice-versa (decisão do aluno).
   */
  tipo: TipoRegisto;
  /**
   * Só preenchido para a conta de teste (`EMAIL_CONTA_DE_TESTE_QR`): a
   * decisão de entrada/saída passa a usar esta data/hora em vez do
   * momento real da leitura — para dar para demonstrar, na defesa oral,
   * a entrada por QR em qualquer dia/hora sem esperar pelo momento certo.
   * A validade do próprio código (`validoAte`) continua a ser real, para
   * o código se manter mesmo scanável.
   */
  momentoSimulado?: Date;
  /**
   * Quando é que este código já deu origem a um registo de entrada/saída.
   * `usado` marca a LEITURA (o porteiro apontou a câmara); este marca a
   * conclusão. Serve para o mesmo código não poder gerar dois movimentos
   * se alguém repetir o pedido de confirmação de identidade.
   */
  movimentoRegistadoEm?: Date;
}

const TokenQRSchema = new Schema<ITokenQR>(
  {
    alunoId: { type: Schema.Types.ObjectId, ref: "Utilizador", required: true },

    token: { type: String, required: true, unique: true },

    criadoEm: { type: Date, required: true, default: Date.now },
    validoAte: { type: Date, required: true },

    usado: { type: Boolean, default: false },
    usadoEm: { type: Date },

    tipo: { type: String, enum: TIPOS_REGISTO, required: true },

    momentoSimulado: { type: Date },

    movimentoRegistadoEm: { type: Date },
  },
  { timestamps: true },
);

// Ao ler um QR na portaria, procuramos sempre "o token válido deste aluno"
// — este índice composto torna essa procura imediata.
TokenQRSchema.index({ alunoId: 1, usado: 1 });

export const TokenQR: Model<ITokenQR> =
  (mongoose.models.TokenQR as Model<ITokenQR>) ||
  mongoose.model<ITokenQR>("TokenQR", TokenQRSchema, "tokensQR");
