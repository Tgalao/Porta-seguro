"use client";

import { useActionState } from "react";
import { CampoPasskey } from "../campo-passkey";

type AcaoCurso = (
  estadoAnterior: string | undefined,
  formData: FormData,
) => Promise<string | undefined>;

interface CursoInicial {
  id: string;
  nome: string;
  sigla: string;
  anosDuracao: number;
  coordenadorId?: string;
}

export function FormularioCurso({
  acao,
  coordenadores,
  cursoInicial,
}: {
  acao: AcaoCurso;
  coordenadores: Array<{ id: string; nome: string }>;
  cursoInicial?: CursoInicial;
}) {
  const [erro, executarAcao, aEnviar] = useActionState(acao, undefined);

  return (
    <form action={executarAcao} className="flex max-w-md flex-col gap-3">
      {cursoInicial && <input type="hidden" name="id" value={cursoInicial.id} />}

      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input
          name="nome"
          required
          defaultValue={cursoInicial?.nome}
          className="rounded border px-3 py-2 dark:bg-transparent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Sigla
        <input
          name="sigla"
          required
          defaultValue={cursoInicial?.sigla}
          className="rounded border px-3 py-2 dark:bg-transparent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Anos de duração
        <input
          name="anosDuracao"
          type="number"
          min={1}
          required
          defaultValue={cursoInicial?.anosDuracao}
          className="rounded border px-3 py-2 dark:bg-transparent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Coordenador
        <select
          name="coordenadorId"
          defaultValue={cursoInicial?.coordenadorId ?? ""}
          className="rounded border px-3 py-2 dark:bg-transparent"
        >
          <option value="">— Sem coordenador —</option>
          {coordenadores.map((coordenador) => (
            <option key={coordenador.id} value={coordenador.id}>
              {coordenador.nome}
            </option>
          ))}
        </select>
      </label>

      {cursoInicial && <CampoPasskey />}

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
