import Link from "next/link";

/**
 * Cabeçalho partilhado por todas as páginas "internas" do site (depois do
 * login): espaço reservado para o logotipo, título/subtítulo da secção, e
 * um link para voltar ao ecrã lógico anterior. A mesma estrutura que já
 * existe em /portao-teste e /horarios, extraída para não repetir o mesmo
 * bloco de HTML em cada página nova.
 */
export function CabecalhoSecao({
  titulo,
  subtitulo,
  voltarHref,
  voltarLabel,
  acao,
}: {
  titulo: string;
  subtitulo?: string;
  voltarHref: string;
  voltarLabel: string;
  /** Botão/link extra do lado direito, ex.: "+ Novo curso". */
  acao?: React.ReactNode;
}) {
  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-teal-600/50 bg-teal-50 text-[9px] font-semibold uppercase text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
          >
            Logo
          </div>
          <div className="leading-tight">
            <h1 className="font-semibold">{titulo}</h1>
            {subtitulo && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{subtitulo}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {acao}
          <Link
            href={voltarHref}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            ← {voltarLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
