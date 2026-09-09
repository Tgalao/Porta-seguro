"use client";

import { useEffect, useState } from "react";
import { NOMES_DIAS_SEMANA } from "@/lib/datas";

/** Mesmo ponto de corte do `lg:` do Tailwind — é a partir daqui que
 * `tamanhoGrande` também começa a mostrar todos os dias já abertos. */
const MEDIA_QUERY_PC = "(min-width: 1024px)";

export interface BlocoHorario {
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  disciplina: string;
  sala?: string;
  professor?: string;
  /** Nome da turma — só usado na vista "por professor" (RF10), onde os
   * blocos vêm de turmas diferentes e é preciso dizer qual é qual. */
  turma?: string;
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
  mostrarTurma = false,
  diaEmDestaque,
  tamanhoGrande = false,
}: {
  blocos: BlocoHorario[];
  mostrarProfessor?: boolean;
  /** Mostra a turma de cada bloco — usado na vista "por professor". */
  mostrarTurma?: boolean;
  /** Dia da semana a destacar (0 = domingo). Usado para marcar "hoje" e
   * para começar já aberto, por ser o dia mais provável de interessar. */
  diaEmDestaque?: number;
  /** Letras maiores e uma 3.ª coluna em ecrãs largos — usado na área
   * pessoal do aluno, agora que tem uma aba só para o horário e sobra
   * espaço no PC para o mostrar mais confortável. */
  tamanhoGrande?: boolean;
}) {
  // Só os dias que têm mesmo aulas, pela ordem da semana.
  const diasComAulas = [...new Set(blocos.map((b) => b.diaSemana))].sort((a, b) => a - b);

  const [diasAbertos, setDiasAbertos] = useState<ReadonlySet<number>>(
    () => new Set(diaEmDestaque !== undefined ? [diaEmDestaque] : []),
  );

  // No PC (só quando `tamanhoGrande`), mostra logo todos os dias abertos —
  // há espaço de sobra e poupa o clique. No telemóvel mantém-se fechado
  // por omissão, como sempre foi: aí a informação toda de uma vez não cabe.
  // Corre no cliente (media query real, não CSS) porque a decisão de
  // ABRIR ou não é lógica de estado, não só de aparência.
  useEffect(() => {
    if (!tamanhoGrande) return;

    const consulta = window.matchMedia(MEDIA_QUERY_PC);
    function aplicar(ehPC: boolean) {
      setDiasAbertos(ehPC ? new Set(diasComAulas) : new Set(diaEmDestaque !== undefined ? [diaEmDestaque] : []));
    }
    function aoMudar(evento: MediaQueryListEvent) {
      aplicar(evento.matches);
    }

    aplicar(consulta.matches);
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- diasComAulas é derivado de `blocos`, incluí-lo repetia o efeito sempre que a referência do array mudasse sem os dias mudarem de facto
  }, [tamanhoGrande, diaEmDestaque]);

  if (blocos.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Ainda sem horário definido.</p>;
  }

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
    <div className={`grid gap-3 sm:grid-cols-2 ${tamanhoGrande ? "lg:grid-cols-3 lg:gap-4" : ""}`}>
      {diasComAulas.map((dia) => {
        const doDia = blocos
          .filter((b) => b.diaSemana === dia)
          .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
        const emDestaque = dia === diaEmDestaque;
        const aberto = diasAbertos.has(dia);

        return (
          <div
            key={dia}
            className={`overflow-hidden rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-900/5 ${
              emDestaque
                ? "border-blue-300 bg-blue-50 hover:border-blue-400 dark:border-blue-700 dark:bg-blue-950/40"
                : "border-slate-200 bg-slate-50/60 hover:border-blue-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-blue-700"
            }`}
          >
            <button
              type="button"
              onClick={() => alternar(dia)}
              aria-expanded={aberto}
              className={`flex w-full items-center justify-between gap-2 text-left ${tamanhoGrande ? "p-4 lg:p-5" : "p-3.5"}`}
            >
              <span
                className={`flex flex-wrap items-center gap-2 font-semibold ${tamanhoGrande ? "text-base lg:text-lg" : "text-sm"}`}
              >
                {NOMES_DIAS_SEMANA[dia]}
                {emDestaque && (
                  <span className="rounded-full bg-blue-700 px-2 py-0.5 text-[10px] font-medium text-white">
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
              <ul
                className={`flex flex-col px-3.5 pb-3.5 ${tamanhoGrande ? "gap-3 lg:px-5 lg:pb-5 lg:text-base" : "gap-1.5 text-sm"}`}
              >
                {doDia.map((bloco, indice) => (
                  <li key={indice} className="flex flex-col">
                    <span
                      className={`font-mono tabular-nums text-blue-700 dark:text-blue-400 ${tamanhoGrande ? "text-sm" : "text-xs"}`}
                    >
                      {bloco.horaInicio}–{bloco.horaFim}
                    </span>
                    <span className="font-medium">
                      {bloco.disciplina}
                      {mostrarTurma && bloco.turma && (
                        <span className="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {bloco.turma}
                        </span>
                      )}
                    </span>
                    {/* Não prefixar com "Sala": o campo já costuma vir escrito
                     * por extenso na base de dados (ex.: "Sala 101"). */}
                    <span
                      className={`text-slate-500 dark:text-slate-400 ${tamanhoGrande ? "text-sm" : "text-xs"}`}
                    >
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
