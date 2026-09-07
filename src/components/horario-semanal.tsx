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
    return <p className="text-sm opacity-60">Ainda sem horário definido.</p>;
  }

  // Só os dias que têm mesmo aulas, pela ordem da semana.
  const diasComAulas = [...new Set(blocos.map((b) => b.diaSemana))].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-3">
      {diasComAulas.map((dia) => {
        const doDia = blocos
          .filter((b) => b.diaSemana === dia)
          .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

        return (
          <div
            key={dia}
            className={`rounded border p-3 ${
              dia === diaEmDestaque ? "border-blue-600 bg-blue-50 dark:bg-blue-950" : ""
            }`}
          >
            <p className="mb-1 text-sm font-semibold">
              {NOMES_DIAS_SEMANA[dia]}
              {dia === diaEmDestaque && (
                <span className="ml-2 text-xs font-normal opacity-70">(hoje)</span>
              )}
            </p>
            <ul className="flex flex-col gap-0.5 text-sm">
              {doDia.map((bloco, indice) => (
                <li key={indice} className="flex flex-wrap gap-x-3">
                  <span className="font-mono tabular-nums opacity-70">
                    {bloco.horaInicio}–{bloco.horaFim}
                  </span>
                  <span>{bloco.disciplina}</span>
                  {/* Não prefixar com "Sala": o campo já costuma vir escrito
                   * por extenso na base de dados (ex.: "Sala 101"). */}
                  {bloco.sala && <span className="opacity-60">{bloco.sala}</span>}
                  {mostrarProfessor && bloco.professor && (
                    <span className="opacity-60">{bloco.professor}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
