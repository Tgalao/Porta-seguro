"use client";

import { useActionState } from "react";
import { entrarComCredenciais } from "./acoes";

/**
 * Componente de cliente porque usa `useActionState`, um hook do React que
 * guarda a mensagem de erro devolvida pela Server Action e sabe quando o
 * formulário está a ser submetido (para desativar o botão).
 */
export function FormularioCredenciais() {
  const [erro, acao, aEnviar] = useActionState(entrarComCredenciais, undefined);

  return (
    <form action={acao} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Email institucional
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded border px-3 py-2 dark:bg-transparent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Palavra-passe
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="rounded border px-3 py-2 dark:bg-transparent"
        />
      </label>

      {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

      <button
        type="submit"
        disabled={aEnviar}
        className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {aEnviar ? "A entrar..." : "Entrar"}
      </button>
    </form>
  );
}
