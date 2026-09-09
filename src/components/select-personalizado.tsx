"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface OpcaoSelect {
  valor: string;
  rotulo: string;
}

/**
 * Substituto do `<select>` nativo: o menu aberto de um `<select>` é
 * desenhado pelo sistema operativo, não pelo browser, por isso não há CSS
 * que o faça combinar com o resto do site (cantos direitos, cores fixas).
 * Este componente é só um botão + uma lista normal em HTML, por isso
 * herda os mesmos `rounded-lg`/cores/dark mode de qualquer outro elemento
 * da página.
 */
export function SelectPersonalizado({
  rotulo,
  valor,
  opcoes,
  onAlterar,
  className = "",
}: {
  rotulo: string;
  valor: string;
  opcoes: OpcaoSelect[];
  onAlterar: (valor: string) => void;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const idBotao = useId();

  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(evento: MouseEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    function aoPressionarEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }

    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoPressionarEscape);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoPressionarEscape);
    };
  }, [aberto]);

  const selecionada = opcoes.find((o) => o.valor === valor);

  return (
    <div ref={raiz} className={`relative flex flex-col gap-1 text-sm ${className}`}>
      <span id={idBotao} className="text-slate-700 dark:text-slate-300">
        {rotulo}
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-labelledby={idBotao}
        onClick={() => setAberto((atual) => !atual)}
        className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left transition hover:border-blue-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-600"
      >
        <span>{selecionada?.rotulo ?? "Selecionar"}</span>
        <IconeChevron aberto={aberto} />
      </button>

      {aberto && (
        <ul
          role="listbox"
          aria-labelledby={idBotao}
          className="absolute top-full left-0 z-20 mt-1 max-h-64 w-full min-w-max overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900"
        >
          {opcoes.map((opcao) => {
            const ativa = opcao.valor === valor;
            return (
              <li key={opcao.valor}>
                <button
                  type="button"
                  role="option"
                  aria-selected={ativa}
                  onClick={() => {
                    onAlterar(opcao.valor);
                    setAberto(false);
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-left transition ${
                    ativa
                      ? "bg-blue-700 text-white"
                      : "text-slate-700 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-blue-950/40"
                  }`}
                >
                  {opcao.rotulo}
                </button>
              </li>
            );
          })}
          {opcoes.length === 0 && (
            <li className="px-3 py-2 text-slate-400 dark:text-slate-500">Sem opções.</li>
          )}
        </ul>
      )}
    </div>
  );
}

function IconeChevron({ aberto }: { aberto: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden
      className={`shrink-0 text-slate-400 transition-transform duration-150 ${aberto ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
