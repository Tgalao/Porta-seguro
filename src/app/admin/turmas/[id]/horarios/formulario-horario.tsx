"use client";

import { useActionState } from "react";
import { NOMES_DIAS_SEMANA } from "@/lib/datas";
import { CampoPasskey } from "../../../campo-passkey";

type AcaoHorario = (
  estadoAnterior: string | undefined,
  formData: FormData,
) => Promise<string | undefined>;

interface HorarioInicial {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  disciplina: string;
  professorId?: string;
  sala?: string;
}

export function FormularioHorario({
  acao,
  turmaId,
  professores,
  horarioInicial,
}: {
  acao: AcaoHorario;
  turmaId: string;
  professores: Array<{ id: string; nome: string }>;
  horarioInicial?: HorarioInicial;
}) {
  const [erro, executarAcao, aEnviar] = useActionState(acao, undefined);

  return (
    <form action={executarAcao} className="flex max-w-md flex-col gap-3">
      <input type="hidden" name="turmaId" value={turmaId} />
      {horarioInicial && <input type="hidden" name="id" value={horarioInicial.id} />}

      <label className="flex flex-col gap-1 text-sm">
        Dia da semana
        <select
          name="diaSemana"
          defaultValue={horarioInicial?.diaSemana ?? 1}
          className="rounded border px-3 py-2 dark:bg-transparent"
        >
          {NOMES_DIAS_SEMANA.map((nome, indice) => (
            <option key={nome} value={indice}>
              {nome}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Hora de início
          <input
            name="horaInicio"
            type="time"
            required
            defaultValue={horarioInicial?.horaInicio}
            className="rounded border px-3 py-2 dark:bg-transparent"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Hora de fim
          <input
            name="horaFim"
            type="time"
            required
            defaultValue={horarioInicial?.horaFim}
            className="rounded border px-3 py-2 dark:bg-transparent"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Disciplina
        <input
          name="disciplina"
          required
          defaultValue={horarioInicial?.disciplina}
          className="rounded border px-3 py-2 dark:bg-transparent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Professor(a)
        <select
          name="professorId"
          defaultValue={horarioInicial?.professorId ?? ""}
          className="rounded border px-3 py-2 dark:bg-transparent"
        >
          <option value="">— Sem professor(a) atribuído(a) —</option>
          {professores.map((professor) => (
            <option key={professor.id} value={professor.id}>
              {professor.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Sala
        <input
          name="sala"
          defaultValue={horarioInicial?.sala}
          className="rounded border px-3 py-2 dark:bg-transparent"
        />
      </label>

      {horarioInicial && <CampoPasskey />}

      {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

      <button
        type="submit"
        disabled={aEnviar}
        className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {aEnviar ? "A guardar..." : "Guardar"}
      </button>
    </form>
  );
}
