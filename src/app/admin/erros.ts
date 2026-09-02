/**
 * Traduz os erros mais comuns do Mongoose para mensagens que um utilizador
 * consegue perceber. Partilhado pelas ações de cursos/turmas/alunos.
 */
export function mensagemDeErroMongoose(erro: unknown, mensagemDuplicado: string): string {
  if (erro && typeof erro === "object" && "code" in erro && (erro as { code?: number }).code === 11000) {
    return mensagemDuplicado;
  }
  return erro instanceof Error ? erro.message : "Ocorreu um erro inesperado.";
}
