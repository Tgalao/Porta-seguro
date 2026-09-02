/**
 * Validação de código QR dinâmico (RF15/RF16).
 *
 * A procura do token pelo texto lido na câmara é feita antes de chamar esta
 * função (é acesso à base de dados, não pode estar aqui). Se não existir
 * nenhum token com esse texto, trata-se de "código desconhecido" — um caso
 * tratado diretamente por quem chama esta função, porque aí nem há um
 * aluno a quem associar a tentativa.
 */

import type { Types } from "mongoose";

/** Só os campos do TokenQR de que esta validação precisa. */
export interface DadosTokenQR {
  alunoId: Types.ObjectId | string;
  validoAte: Date;
  usado: boolean;
}

/**
 * Os valores coincidem de propósito com o final dos nomes em
 * TIPOS_OCORRENCIA ("qr_" + motivo), para quem chamar esta função poder
 * construir o tipo de ocorrência sem uma tabela de conversão à parte.
 */
export type MotivoTokenInvalido = "aluno_diferente" | "ja_utilizado" | "expirado";

export type ResultadoValidacaoQR =
  | { valido: true }
  | { valido: false; motivo: MotivoTokenInvalido };

/**
 * Ordem das verificações: identidade primeiro — um QR de outro aluno é o
 * problema mais grave, independentemente de estar ou não expirado/usado —
 * depois reutilização, e só por fim expiração.
 *
 * Fronteira de expiração: o token deixa de ser válido no instante exato de
 * `validoAte` (comparação `>=`), não só depois dele.
 */
export function validarTokenQR(
  tokenQR: DadosTokenQR,
  alunoIdQueApresenta: Types.ObjectId | string,
  momento: Date,
): ResultadoValidacaoQR {
  if (String(tokenQR.alunoId) !== String(alunoIdQueApresenta)) {
    return { valido: false, motivo: "aluno_diferente" };
  }

  if (tokenQR.usado) {
    return { valido: false, motivo: "ja_utilizado" };
  }

  if (momento >= tokenQR.validoAte) {
    return { valido: false, motivo: "expirado" };
  }

  return { valido: true };
}
