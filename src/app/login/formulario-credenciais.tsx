"use client";

import { useActionState, useState } from "react";
import { entrarComCredenciais } from "./acoes";

/**
 * Componente de cliente porque usa `useActionState`, um hook do React que
 * guarda a mensagem de erro devolvida pela Server Action e sabe quando o
 * formulário está a ser submetido (para desativar o botão).
 */
export function FormularioCredenciais() {
  const [erro, acao, aEnviar] = useActionState(entrarComCredenciais, undefined);
  const [passwordVisivel, setPasswordVisivel] = useState(false);

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
        <div className="relative">
          <input
            type={passwordVisivel ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            className="w-full rounded border px-3 py-2 pr-10 dark:bg-transparent"
          />
          <button
            type="button"
            onClick={() => setPasswordVisivel((atual) => !atual)}
            aria-label={passwordVisivel ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
            aria-pressed={passwordVisivel}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center opacity-60 hover:opacity-100"
          >
            {passwordVisivel ? <IconeOlhoFechado /> : <IconeOlho />}
          </button>
        </div>
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

/** Olho aberto: a palavra-passe está oculta, clicar mostra-a. */
function IconeOlho() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** Olho riscado: a palavra-passe está visível, clicar oculta-a. */
function IconeOlhoFechado() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
