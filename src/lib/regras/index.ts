/**
 * Ponto único de acesso à lógica de decisão da Fase 3.
 */

export { decidirSaida, type AlunoParaDecisaoSaida, type DecisaoSaida } from "./decidirSaida";
export {
  decidirEntrada,
  type AlunoParaDecisaoEntrada,
  type DecisaoEntrada,
} from "./decidirEntrada";
export {
  validarTokenQR,
  type DadosTokenQR,
  type MotivoTokenInvalido,
  type ResultadoValidacaoQR,
} from "./validarTokenQR";
export { encontrarBlocoADecorrer } from "./horarios";
export {
  calcularEstadoPorta,
  type EstadoPorta,
  type ResultadoEstadoPorta,
} from "./estadoPorta";
