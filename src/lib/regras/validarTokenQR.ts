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
import type { TipoRegisto } from "@/lib/constantes";

/** Só os campos do TokenQR de que esta validação precisa. */
export interface DadosTokenQR {
  alunoId: Types.ObjectId | string;
  validoAte: Date;
  usado: boolean;
  /** Direção com que o código foi gerado (RF15: decisão do aluno) — ver
   * `proximoTipoRegisto`. Um código gerado para entrar nunca serve para
   * sair, e vice-versa. */
  tipo: TipoRegisto;
}

/**
 * Os valores coincidem de propósito com o final dos nomes em
 * TIPOS_OCORRENCIA ("qr_" + motivo), para quem chamar esta função poder
 * construir o tipo de ocorrência sem uma tabela de conversão à parte.
 */
export type MotivoTokenInvalido =
  | "aluno_diferente"
  | "ja_utilizado"
  | "expirado"
  | "tipo_incorreto";

export type ResultadoValidacaoQR =
  | { valido: true }
  | { valido: false; motivo: MotivoTokenInvalido };

/**
 * Ordem das verificações: identidade primeiro — um QR de outro aluno é o
 * problema mais grave, independentemente de estar ou não expirado/usado —
 * depois reutilização, depois expiração, e só por fim a direção. A direção
 * fica por último porque as outras três invalidam o código nele mesmo;
 * "direção errada" só faz sentido perguntar depois de já se saber que o
 * código, em si, ainda era bom.
 *
 * Fronteira de expiração: o token deixa de ser válido no instante exato de
 * `validoAte` (comparação `>=`), não só depois dele.
 */
export function validarTokenQR(
  tokenQR: DadosTokenQR,
  alunoIdQueApresenta: Types.ObjectId | string,
  tipoEsperado: TipoRegisto,
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

  if (tokenQR.tipo !== tipoEsperado) {
    return { valido: false, motivo: "tipo_incorreto" };
  }

  return { valido: true };
}
