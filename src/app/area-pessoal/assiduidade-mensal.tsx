"use client";

import { useId, useState } from "react";

export interface LinhaDiaAssinalar {
  dataFormatada: string;
  situacao: "presenca_atraso" | "falta";
  /** Hora exata da entrada ("09:15") — ausente numa falta, porque não há
   * entrada nenhuma para ter hora. */
  horaEntradaFormatada?: string;
}

/**
 * Assiduidade do mês: os números-resumo (dias letivos, presenças, atrasos,
 * faltas) ficam sempre visíveis; a lista dia-a-dia fica escondida atrás de
 * um botão — só quem quer mesmo ver QUAIS dias tiveram falta/atraso é que
 * clica, em vez de a página abrir sempre com uma lista comprida.
 */
export function AssiduidadeMensal({
  mes,
  ano,
  diasLetivos,
  presencas,
  atrasos,
  faltas,
  taxaPresenca,
  diasAssinalar,
}: {
  mes: number;
  ano: number;
  diasLetivos: number;
  presencas: number;
  atrasos: number;
  faltas: number;
  taxaPresenca: number;
  diasAssinalar: LinhaDiaAssinalar[];
}) {
  const [aberto, setAberto] = useState(false);
  const idLista = useId();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        A minha assiduidade
        <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
          {String(mes).padStart(2, "0")}/{ano}
        </span>
      </h2>

      {diasLetivos === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ainda não há dias letivos registados neste mês.
        </p>
      ) : (
        <>
          <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Numero titulo="Dias letivos" valor={diasLetivos} />
            <Numero titulo="Presenças" valor={presencas} destaque="ok" />
            <Numero titulo="Atrasos" valor={atrasos} destaque="aviso" />
            <Numero titulo="Faltas" valor={faltas} destaque="critico" />
          </div>

          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Taxa de presença: {(taxaPresenca * 100).toFixed(0)}%
          </p>

          {diasAssinalar.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setAberto((atual) => !atual)}
                aria-expanded={aberto}
                aria-controls={idLista}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-left text-sm font-medium transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-blue-700"
              >
                <span>
                  Dias a assinalar
                  <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">
                    ({diasAssinalar.length})
                  </span>
                </span>
                <IconeChevron aberto={aberto} />
              </button>

              {aberto && (
                <ul id={idLista} className="mt-2 flex flex-col gap-1 text-sm">
                  {diasAssinalar.map((dia, indice) => (
                    <li
                      key={indice}
                      className="flex flex-wrap items-center gap-3 rounded-lg px-2 py-1.5 transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md hover:shadow-blue-900/5 dark:hover:bg-blue-950/30"
                    >
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {dia.dataFormatada}
                      </span>
                      <span
                        className={
                          dia.situacao === "falta"
                            ? "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
                            : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }
                      >
                        {dia.situacao === "falta" ? "Falta" : "Presença com atraso"}
                      </span>
                      {dia.horaEntradaFormatada && (
                        <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                          entrou às {dia.horaEntradaFormatada}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Numero({
  titulo,
  valor,
  destaque,
}: {
  titulo: string;
  valor: number;
  destaque?: "ok" | "aviso" | "critico";
}) {
  const cores = {
    ok: "text-emerald-700 dark:text-emerald-400",
    aviso: "text-amber-700 dark:text-amber-400",
    critico: "text-red-700 dark:text-red-400",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
      <p className={`text-2xl font-bold tabular-nums ${destaque ? cores[destaque] : ""}`}>{valor}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{titulo}</p>
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
      className={`shrink-0 text-slate-500 dark:text-slate-400 transition-transform duration-150 ${aberto ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
