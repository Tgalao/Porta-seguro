"use client";

import { useId, useRef, type ReactNode } from "react";
import { useState } from "react";

type Aba = "qr" | "horario" | "assiduidade";

const ORDEM: Aba[] = ["qr", "horario", "assiduidade"];

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
 *
 * Segue o padrão de teclado do WAI-ARIA para "tabs": as setas esquerda/
 * direita movem o foco entre os botões e já trocam de aba (não é preciso
 * Enter a seguir — é assim que um leitor de ecrã espera que um `role="tab"`
 * se comporte), Home/Fim saltam para a primeira/última. `aria-controls` +
 * `role="tabpanel"` ligam cada botão ao conteúdo que ele mostra, para um
 * leitor de ecrã anunciar a ligação — antes o botão e o conteúdo não
 * tinham nenhuma relação formal entre si.
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
  const idBase = useId();
  const botoesRef = useRef<Record<Aba, HTMLButtonElement | null>>({
    qr: null,
    horario: null,
    assiduidade: null,
  });

  function irPara(chave: Aba) {
    setAba(chave);
    botoesRef.current[chave]?.focus();
  }

  function aoTeclar(evento: React.KeyboardEvent, indiceAtual: number) {
    switch (evento.key) {
      case "ArrowRight":
        evento.preventDefault();
        irPara(ORDEM[(indiceAtual + 1) % ORDEM.length]);
        break;
      case "ArrowLeft":
        evento.preventDefault();
        irPara(ORDEM[(indiceAtual - 1 + ORDEM.length) % ORDEM.length]);
        break;
      case "Home":
        evento.preventDefault();
        irPara(ORDEM[0]);
        break;
      case "End":
        evento.preventDefault();
        irPara(ORDEM[ORDEM.length - 1]);
        break;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-1 dark:border-slate-800 dark:bg-slate-800/40"
        role="tablist"
        aria-label="Secção da área pessoal"
      >
        {ORDEM.map((chave, indice) => {
          const ativo = chave === aba;
          return (
            <button
              key={chave}
              ref={(elemento) => {
                botoesRef.current[chave] = elemento;
              }}
              type="button"
              role="tab"
              id={`${idBase}-tab-${chave}`}
              aria-selected={ativo}
              aria-controls={`${idBase}-painel-${chave}`}
              // Roving tabindex: só a aba ativa está no ciclo normal do Tab;
              // as outras alcançam-se com as setas, tal como o padrão WAI-ARIA
              // de "tabs" espera (Tab entra/sai do grupo, setas movem dentro).
              tabIndex={ativo ? 0 : -1}
              onClick={() => setAba(chave)}
              onKeyDown={(evento) => aoTeclar(evento, indice)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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

      {/* Só a aba ativa é montada — ao contrário do `hidden` que o padrão
          WAI-ARIA costuma usar, aqui o conteúdo tem efeitos vivos a sério
          (o código QR fica a perguntar ao servidor de 2 em 2 segundos se já
          foi lido); mantê-lo montado escondido continuava a fazer esses
          pedidos com a aba fechada. A ligação aba↔painel (id/aria-labelledby)
          fica na mesma, só que num único painel de cada vez. */}
      <div
        key={aba}
        role="tabpanel"
        id={`${idBase}-painel-${aba}`}
        aria-labelledby={`${idBase}-tab-${aba}`}
      >
        {conteudos[aba]}
      </div>
    </div>
  );
}
