"use client";

import { useActionState } from "react";
import { CampoPasskey } from "../campo-passkey";

type AcaoAluno = (
  estadoAnterior: string | undefined,
  formData: FormData,
) => Promise<string | undefined>;

interface AlunoInicial {
  id: string;
  nomeCompleto: string;
  email: string;
  numeroAluno?: number;
  numeroCartao?: string;
  turmaId?: string;
  maiorIdade: boolean;
  autorizacaoPais: boolean;
  suspenso: boolean;
}

export function FormularioAluno({
  acao,
  turmas,
  alunoInicial,
}: {
  acao: AcaoAluno;
  turmas: Array<{ id: string; nome: string }>;
  alunoInicial?: AlunoInicial;
}) {
  const [erro, executarAcao, aEnviar] = useActionState(acao, undefined);

  return (
    <form action={executarAcao} className="flex max-w-md flex-col gap-3">
      {alunoInicial && <input type="hidden" name="id" value={alunoInicial.id} />}

      <label className="flex flex-col gap-1 text-sm">
        Nome completo
        <input
          name="nomeCompleto"
          required
          defaultValue={alunoInicial?.nomeCompleto}
          className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-transparent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email institucional
        <input
          name="email"
          type="email"
          required
          defaultValue={alunoInicial?.email}
          className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-transparent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {alunoInicial ? "Nova palavra-passe (deixa em branco para não alterar)" : "Palavra-passe (opcional — sem ela, só entra com conta Google)"}
        <input
          name="palavraPasse"
          type="password"
          autoComplete="new-password"
          className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-transparent"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Número de aluno
          <input
            name="numeroAluno"
            type="number"
            defaultValue={alunoInicial?.numeroAluno}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-transparent"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Número do cartão
          <input
            name="numeroCartao"
            defaultValue={alunoInicial?.numeroCartao}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-transparent"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Turma
        <select
          name="turmaId"
          defaultValue={alunoInicial?.turmaId ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-transparent"
        >
          <option value="">— Sem turma atribuída —</option>
          {turmas.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="maiorIdade" defaultChecked={alunoInicial?.maiorIdade} className="accent-blue-700" />
        Maior de idade
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="autorizacaoPais"
          defaultChecked={alunoInicial?.autorizacaoPais}
          className="accent-blue-700"
        />
        Tem autorização dos pais para sair fora do horário
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="suspenso" defaultChecked={alunoInicial?.suspenso} className="accent-blue-700" />
        Suspenso (bloqueia a entrada)
      </label>

      {alunoInicial && <CampoPasskey />}

      {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

      <button
        type="submit"
        disabled={aEnviar}
        className="mt-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
      >
        {aEnviar ? "A guardar..." : "Guardar"}
      </button>
    </form>
  );
}
