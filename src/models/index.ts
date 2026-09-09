/**
 * Ponto único de acesso a todos os modelos.
 *
 * Em vez de `import { Utilizador } from "@/models/Utilizador"` em cada
 * ficheiro, escreve-se `import { Utilizador } from "@/models"`.
 */

export { Curso, type ICurso } from "./Curso";
export { Turma, type ITurma } from "./Turma";
export { Utilizador, type IUtilizador } from "./Utilizador";
export { Horario, type IHorario } from "./Horario";
export { Registo, type IRegisto } from "./Registo";
export { TokenQR, type ITokenQR } from "./TokenQR";
export { Ocorrencia, type IOcorrencia } from "./Ocorrencia";
export {
  TentativaLogin,
  type ITentativaLogin,
  MAX_TENTATIVAS,
  JANELA_MINUTOS,
} from "./TentativaLogin";
