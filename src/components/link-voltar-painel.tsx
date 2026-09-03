import Link from "next/link";

/**
 * Link para voltar ao painel principal — usado no topo de cada ecrã que só
 * um perfil específico vê (portaria, consultas, administração, área
 * pessoal). Sem isto não havia forma de sair dessas páginas a não ser
 * escrever o URL à mão ou usar o botão "recuar" do browser.
 */
export function LinkVoltarPainel() {
  return (
    <Link
      href="/painel"
      className="w-fit text-sm opacity-70 hover:underline hover:opacity-100"
    >
      ← Painel
    </Link>
  );
}
