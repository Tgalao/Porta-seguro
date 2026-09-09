/**
 * Traduz os erros mais comuns do Mongoose para mensagens que um utilizador
 * consegue perceber. Partilhado pelas ações de cursos/turmas/alunos.
 */
export function mensagemDeErroMongoose(erro: unknown, mensagemDuplicado: string): string {
  if (erro && typeof erro === "object" && "code" in erro && (erro as { code?: number }).code === 11000) {
    return mensagemDuplicado;
  }

  // Só vão para o ecrã as mensagens que nós próprios escrevemos: as
  // validações dos modelos (`ValidationError`) e os `throw new Error(...)`
  // dos nossos hooks. Um erro vindo do servidor de base de dados pode
  // trazer nomes de coleções, de índices ou endereços do cluster — isso
  // não é para mostrar a ninguém.
  if (erro instanceof Error && (erro.name === "ValidationError" || erro.name === "Error")) {
    return erro.message;
  }

  return "Ocorreu um erro inesperado.";
}
