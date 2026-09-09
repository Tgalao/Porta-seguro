"use client";

import { useState } from "react";
import { HorarioSemanal, type BlocoHorario } from "@/components/horario-semanal";
import { SeletorTurma, type TurmaComHorario } from "./seletor-turma";

export interface ProfessorComHorario {
  id: string;
  nome: string;
  blocos: BlocoHorario[];
}

/**
 * O horário de uma TURMA (todas as disciplinas, vários professores) e o
 * horário de UM PROFESSOR (as suas próprias aulas, em turmas diferentes)
 * são coisas diferentes — um professor só dá normalmente 2-3 blocos por
 * dia, contra o dia inteiro de uma turma — por isso ficam em separado,
 * atrás de um alternador, em vez de misturados na mesma vista.
 *
 * `meuHorario` só vem preenchido para quem tem perfil "professor" (vê
 * sempre e só o seu). `professores` só vem preenchido para o admin (pode
 * escolher qualquer professor). Nunca vêm os dois ao mesmo tempo.
 */
export function VistaHorario({
  turmas,
  meuHorario,
  professores,
}: {
  turmas: TurmaComHorario[];
  meuHorario?: BlocoHorario[];
  professores?: ProfessorComHorario[];
}) {
  const [vista, setVista] = useState<"turma" | "pessoal">(meuHorario ? "pessoal" : "turma");
  const [idProfessorSelecionado, setIdProfessorSelecionado] = useState(professores?.[0]?.id ?? "");

  if (!meuHorario && !professores) {
    return <SeletorTurma turmas={turmas} />;
  }

  const professorSelecionado = professores?.find((p) => p.id === idProfessorSelecionado);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Ver horário por">
        <BotaoAba
          ativo={vista === "pessoal"}
          onClick={() => setVista("pessoal")}
          label={meuHorario ? "O meu horário" : "Por professor"}
        />
        <BotaoAba ativo={vista === "turma"} onClick={() => setVista("turma")} label="Por turma" />
      </div>

      {vista === "turma" && <SeletorTurma turmas={turmas} />}

      {vista === "pessoal" && meuHorario && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 font-semibold">As minhas aulas</h2>
          <HorarioSemanal blocos={meuHorario} mostrarTurma />
        </section>
      )}

      {vista === "pessoal" && professores && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Escolher professor">
            {professores.map((professor) => {
              const ativo = professor.id === idProfessorSelecionado;
              return (
                <button
                  key={professor.id}
                  type="button"
                  role="tab"
                  aria-selected={ativo}
                  onClick={() => setIdProfessorSelecionado(professor.id)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                    ativo
                      ? "border-blue-700 bg-blue-700 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:text-blue-400"
                  }`}
                >
                  {professor.nome}
                </button>
              );
            })}
          </div>

          {professorSelecionado && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 font-semibold">{professorSelecionado.nome}</h2>
              <HorarioSemanal blocos={professorSelecionado.blocos} mostrarTurma />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function BotaoAba({
  ativo,
  onClick,
  label,
}: {
  ativo: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={ativo}
      onClick={onClick}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
        ativo
          ? "border-blue-700 bg-blue-700 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:text-blue-400"
      }`}
    >
      {label}
    </button>
  );
}
