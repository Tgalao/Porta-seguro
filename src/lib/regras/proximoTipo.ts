import type { TipoRegisto } from "@/lib/constantes";

/**
 * O tipo de movimento nunca é escolhido por quem se identifica — alterna
 * sempre com o último registo da pessoa: depois de uma entrada só pode vir
 * uma saída, e vice-versa; sem nenhum registo anterior, é sempre entrada.
 *
 * Função pura de propósito, para ser a MESMA regra usada em dois momentos
 * diferentes: quando o aluno gera um código QR (fica bloqueado à direção
 * que faria sentido nesse instante) e quando o porteiro o lê (confirma que
 * ainda faz sentido nesse instante). Ver `validarTokenQR`.
 */
export function proximoTipoRegisto(ultimoTipo: TipoRegisto | undefined): TipoRegisto {
  return ultimoTipo === "entrada" ? "saida" : "entrada";
}
