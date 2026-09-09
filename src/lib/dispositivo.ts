/**
 * Deteção (aproximada, pelo cabeçalho User-Agent) de telemóvel vs.
 * computador — usada só para RESTRINGIR onde o código QR pode ser gerado
 * (RF15: o código destina-se a ser mostrado na portaria a partir do
 * telemóvel do próprio aluno, não fotografado ou copiado de um ecrã de
 * PC). Não é uma verificação de segurança forte (um User-Agent pode ser
 * falsificado) — é só o mesmo tipo de sinal que qualquer site usa para
 * decidir isto, suficiente para o âmbito deste projeto escolar.
 */
export function ehUserAgentDeTelemovel(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
}

/**
 * Único aluno autorizado a gerar o código QR a partir de um computador —
 * para a demonstração/defesa oral, quando não há um telemóvel real
 * disponível. Todos os outros só podem gerar no telemóvel.
 */
export const EMAIL_CONTA_DE_TESTE_QR = "5802@eclisboa.net";
