import { LinkVoltar } from "./link-voltar";

/**
 * Link para voltar ao painel principal — usado no topo de cada ecrã de
 * primeiro nível que só um perfil específico vê (portaria, consultas,
 * horários, área pessoal). Para ecrãs mais fundo na hierarquia (ex.: os
 * formulários dentro da administração), usa `LinkVoltar` diretamente,
 * apontado ao ecrã-pai lógico em vez de saltar sempre para o painel.
 */
export function LinkVoltarPainel() {
  return <LinkVoltar href="/painel" label="Painel" />;
}
