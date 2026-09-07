/**
 * Palavra-chave extra exigida para editar ou remover algo na
 * administração — uma camada de confirmação a mais, por cima de já seres
 * um admin autenticado (decisão do aluno, não estava nos requisitos
 * originais). Criar um registo novo não pede esta palavra-chave, só
 * editar ou remover.
 *
 * O valor vive só em `ADMIN_PASSKEY` (variável de ambiente) — nunca
 * escrito no código. Este repositório é público no GitHub: uma
 * palavra-chave fixa no código deixaria de ser secreta no instante em que
 * fosse commitada.
 */
export function passkeyValida(formData: FormData): boolean {
  const chave = process.env.ADMIN_PASSKEY;
  const digitada = String(formData.get("passkey") ?? "").trim();
  return Boolean(chave) && digitada === chave;
}

export const ERRO_PASSKEY = "Palavra-chave de confirmação incorreta.";
