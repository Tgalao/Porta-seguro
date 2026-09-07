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
 * Tabela do horário semanal, agrupada por dia. Partilhada por três ecrãs
 * (horários das turmas, área pessoal do aluno e portaria), por isso recebe
 * os blocos já prontos — não vai à base de dados.
 */
export function HorarioSemanal({
  blocos,
  mostrarProfessor = false,
  diaEmDestaque,
}: {
  blocos: BlocoHorario[];
  mostrarProfessor?: boolean;
  /** Dia da semana a destacar (0 = domingo). Usado para marcar "hoje". */
  diaEmDestaque?: number;
}) {
  if (blocos.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Ainda sem horário definido.</p>;
  }

  // Só os dias que têm mesmo aulas, pela ordem da semana.
  const diasComAulas = [...new Set(blocos.map((b) => b.diaSemana))].sort((a, b) => a - b);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {diasComAulas.map((dia) => {
        const doDia = blocos
          .filter((b) => b.diaSemana === dia)
          .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
        const emDestaque = dia === diaEmDestaque;

        return (
          <div
            key={dia}
            className={`rounded-xl border p-3.5 ${
              emDestaque
                ? "border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/40"
                : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40"
            }`}
          >
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              {NOMES_DIAS_SEMANA[dia]}
              {emDestaque && (
                <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-medium text-white">
                  Hoje
                </span>
              )}
            </p>
            <ul className="flex flex-col gap-1.5 text-sm">
              {doDia.map((bloco, indice) => (
                <li key={indice} className="flex flex-col">
                  <span className="font-mono text-xs tabular-nums text-teal-700 dark:text-teal-400">
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
          </div>
        );
      })}
    </div>
  );
}
