"use client";

import { useState, type ReactNode } from "react";

type Aba = "qr" | "horario" | "assiduidade";

const ROTULOS: Record<Aba, string> = {
  qr: "Código QR",
  horario: "Horário",
  assiduidade: "Assiduidade",
};

/**
 * As três partes da área pessoal (código QR, horário, assiduidade) tinham-se
 * tornado uma página comprida a fazer scroll — separadas em abas, cada uma
 * ocupa o ecrã todo, mais fácil de ler tanto no telemóvel como no PC (onde
 * a aba do horário usa a largura toda para caber mais dias lado a lado).
 */
export function AbasAreaPessoal({
  qr,
  horario,
  assiduidade,
}: {
  qr: ReactNode;
  horario: ReactNode;
  assiduidade: ReactNode;
}) {
  const [aba, setAba] = useState<Aba>("qr");
  const conteudos: Record<Aba, ReactNode> = { qr, horario, assiduidade };

  return (
    <div className="flex flex-col gap-5">
      <div
        className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-1 dark:border-slate-800 dark:bg-slate-800/40"
        role="tablist"
        aria-label="Secção da área pessoal"
      >
        {(Object.keys(ROTULOS) as Aba[]).map((chave) => {
          const ativo = chave === aba;
          return (
            <button
              key={chave}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setAba(chave)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                ativo
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-blue-400"
              }`}
            >
              {ROTULOS[chave]}
            </button>
          );
        })}
      </div>

      {conteudos[aba]}
    </div>
  );
}
