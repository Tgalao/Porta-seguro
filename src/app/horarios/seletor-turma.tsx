"use client";

import { useState } from "react";
import { HorarioSemanal, type BlocoHorario } from "@/components/horario-semanal";

export interface TurmaComHorario {
  id: string;
  nome: string;
  ano: number;
  blocos: BlocoHorario[];
}

/**
 * Escolhe primeiro a turma, só depois mostra o horário dela — em vez de
 * empilhar o horário de todas as turmas de uma vez, o que ficava
 * impraticável para quem tem muitas turmas atribuídas.
 *
 * Os horários de todas as turmas já vêm prontos do servidor (uma única
 * consulta em horarios/page.tsx); trocar de turma aqui é só trocar que
 * pedaço desses dados se mostra, sem pedir nada de novo à rede.
 */
export function SeletorTurma({ turmas }: { turmas: TurmaComHorario[] }) {
  const [idSelecionado, setIdSelecionado] = useState(turmas[0]?.id ?? "");
  const selecionada = turmas.find((t) => t.id === idSelecionado) ?? turmas[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Escolher turma">
        {turmas.map((turma) => {
          const ativa = turma.id === idSelecionado;
          return (
            <button
              key={turma.id}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setIdSelecionado(turma.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                ativa
                  ? "border-teal-700 bg-teal-700 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-600 dark:hover:text-teal-400"
              }`}
            >
              {turma.nome}
            </button>
          );
        })}
      </div>

      {selecionada && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 font-semibold">
            {selecionada.nome}{" "}
            <span className="font-normal text-slate-500 dark:text-slate-400">
              ({selecionada.ano}.º ano)
            </span>
          </h2>
          <HorarioSemanal blocos={selecionada.blocos} mostrarProfessor />
        </section>
      )}
    </div>
  );
}
