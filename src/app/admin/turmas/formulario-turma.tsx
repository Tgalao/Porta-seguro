"use client";

import { useActionState } from "react";
import { CampoPasskey } from "../campo-passkey";

type AcaoTurma = (
  estadoAnterior: string | undefined,
  formData: FormData,
) => Promise<string | undefined>;

interface TurmaInicial {
  id: string;
  nome: string;
  ano: number;
  cursoId: string;
  diretorTurmaId?: string;
}

export function FormularioTurma({
  acao,
  cursos,
  diretores,
  turmaInicial,
}: {
  acao: AcaoTurma;
  cursos: Array<{ id: string; nome: string }>;
  diretores: Array<{ id: string; nome: string }>;
  turmaInicial?: TurmaInicial;
}) {
  const [erro, executarAcao, aEnviar] = useActionState(acao, undefined);

  return (
    <form action={executarAcao} className="flex max-w-md flex-col gap-3">
      {turmaInicial && <input type="hidden" name="id" value={turmaInicial.id} />}

      <label className="flex flex-col gap-1 text-sm">
        Nome (ex.: 3API)
        <input
          name="nome"
          required
          defaultValue={turmaInicial?.nome}
          className="rounded border px-3 py-2 dark:bg-transparent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Ano
        <input
          name="ano"
          type="number"
          min={1}
          required
          defaultValue={turmaInicial?.ano}
          className="rounded border px-3 py-2 dark:bg-transparent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Curso
        <select
          name="cursoId"
          required
          defaultValue={turmaInicial?.cursoId ?? ""}
          className="rounded border px-3 py-2 dark:bg-transparent"
        >
          <option value="" disabled>
            — Escolhe um curso —
          </option>
          {cursos.map((curso) => (
            <option key={curso.id} value={curso.id}>
              {curso.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Diretor(a) de turma
        <select
          name="diretorTurmaId"
          defaultValue={turmaInicial?.diretorTurmaId ?? ""}
          className="rounded border px-3 py-2 dark:bg-transparent"
        >
          <option value="">— Sem diretor(a) atribuído(a) —</option>
          {diretores.map((diretor) => (
            <option key={diretor.id} value={diretor.id}>
              {diretor.nome}
            </option>
          ))}
        </select>
      </label>

      {turmaInicial && <CampoPasskey />}

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
