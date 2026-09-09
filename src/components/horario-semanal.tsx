"use client";

import { useState } from "react";
import { NOMES_DIAS_SEMANA } from "@/lib/datas";

export interface BlocoHorario {
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  disciplina: string;
  sala?: string;
  professor?: string;
}

/**
 * Horário semanal, agrupado por dia, em formato de acordeão: cada dia
 * começa fechado (só o nome e a contagem de aulas) e abre ao clicar,
 * mostrando os blocos desse dia — dá para abrir vários dias ao mesmo
 * tempo, não é preciso escolher só um. Mostrar logo todos os dias
 * expandidos de uma vez ficava com demasiada informação junta,
 * principalmente em turmas com muitas aulas por semana.
 *
 * Partilhado por três ecrãs (horários das turmas, área pessoal do aluno e
 * portaria), por isso recebe os blocos já prontos — não vai à base de dados.
 */
export function HorarioSemanal({
  blocos,
  mostrarProfessor = false,
  diaEmDestaque,
}: {
  blocos: BlocoHorario[];
  mostrarProfessor?: boolean;
  /** Dia da semana a destacar (0 = domingo). Usado para marcar "hoje" e
   * para começar já aberto, por ser o dia mais provável de interessar. */
  diaEmDestaque?: number;
}) {
  const [diasAbertos, setDiasAbertos] = useState<ReadonlySet<number>>(
    () => new Set(diaEmDestaque !== undefined ? [diaEmDestaque] : []),
  );

  if (blocos.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Ainda sem horário definido.</p>;
  }

  // Só os dias que têm mesmo aulas, pela ordem da semana.
  const diasComAulas = [...new Set(blocos.map((b) => b.diaSemana))].sort((a, b) => a - b);

  function alternar(dia: number) {
    setDiasAbertos((atuais) => {
      const novo = new Set(atuais);
      if (novo.has(dia)) {
        novo.delete(dia);
      } else {
        novo.add(dia);
      }
      return novo;
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {diasComAulas.map((dia) => {
        const doDia = blocos
          .filter((b) => b.diaSemana === dia)
          .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
        const emDestaque = dia === diaEmDestaque;
        const aberto = diasAbertos.has(dia);

        return (
          <div
            key={dia}
            className={`overflow-hidden rounded-xl border transition-colors ${
              emDestaque
                ? "border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/40"
                : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40"
            }`}
          >
            <button
              type="button"
              onClick={() => alternar(dia)}
              aria-expanded={aberto}
              className="flex w-full items-center justify-between gap-2 p-3.5 text-left"
            >
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                {NOMES_DIAS_SEMANA[dia]}
                {emDestaque && (
                  <span className="rounded-full bg-sky-700 px-2 py-0.5 text-[10px] font-medium text-white">
                    Hoje
                  </span>
                )}
                <span className="font-normal text-slate-500 dark:text-slate-400">
                  {doDia.length} {doDia.length === 1 ? "aula" : "aulas"}
                </span>
              </span>
              <IconeChevron aberto={aberto} />
            </button>

            {aberto && (
              <ul className="flex flex-col gap-1.5 px-3.5 pb-3.5 text-sm">
                {doDia.map((bloco, indice) => (
                  <li key={indice} className="flex flex-col">
                    <span className="font-mono text-xs tabular-nums text-sky-700 dark:text-sky-400">
                      {bloco.horaInicio}–{bloco.horaFim}
                    </span>
                    <span className="font-medium">{bloco.disciplina}</span>
                    {/* Não prefixar com "Sala": o campo já costuma vir escrito
                     * por extenso na base de dados (ex.: "Sala 101"). */}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {[bloco.sala, mostrarProfessor ? bloco.professor : undefined]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
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
