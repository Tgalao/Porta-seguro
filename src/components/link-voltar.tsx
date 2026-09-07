import Link from "next/link";

/**
 * Link genérico para voltar ao ecrã anterior na hierarquia (ex.: de
 * "editar curso" para a lista de cursos). Usado no topo de páginas que,
 * de outro modo, só se saía com o "recuar" do browser ou escrevendo o
 * URL à mão.
 */
export function LinkVoltar({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="w-fit text-sm opacity-70 hover:underline hover:opacity-100">
      ← {label}
    </Link>
  );
}
