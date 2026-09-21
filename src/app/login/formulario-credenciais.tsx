"use client";

import { useActionState, useState } from "react";
import { entrarComCredenciais, type EstadoLogin } from "./acoes";

/**
 * Componente de cliente porque usa `useActionState`, um hook do React que
 * guarda o estado devolvido pela Server Action e sabe quando o formulário
 * está a ser submetido (para desativar o botão).
 */
export function FormularioCredenciais() {
  const [estado, acao, aEnviar] = useActionState<EstadoLogin, FormData>(entrarComCredenciais, {
    passo: "credenciais",
  });
  const [passwordVisivel, setPasswordVisivel] = useState(false);
  const [codigo, setCodigo] = useState("");
  const pedeCodigo = estado.passo === "codigo";
  // Campos "controlados" de propósito: depois de uma Server Action que não
  // navega para outra página (ex.: login recusado), o browser repõe o
  // <form> nativo aos valores iniciais — apagava o que a pessoa tinha
  // escrito. Guardar o valor no estado do React sobrevive a esse reset,
  // porque é o React a decidir o que aparece no campo, não o browser.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={acao} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Email institucional
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-transparent"
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
            value={password}
            onChange={(evento) => setPassword(evento.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-transparent"
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

      {pedeCodigo && (
        <label className="flex flex-col gap-1 text-sm">
          Código de acesso
          <input
            // `inputMode="numeric"` faz o telemóvel abrir logo o teclado de
            // números; `autoComplete="one-time-code"` deixa o iOS/Android
            // sugerir o código a partir da notificação do email.
            type="text"
            name="codigo"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            placeholder="000000"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, ""))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-[0.4em] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-transparent"
          />
        </label>
      )}

      {estado.aviso && !estado.erro && (
        <p className="text-sm text-blue-700 dark:text-blue-400">{estado.aviso}</p>
      )}
      {estado.erro && <p className="text-sm text-red-600 dark:text-red-400">{estado.erro}</p>}

      <button
        type="submit"
        disabled={aEnviar}
        className="mt-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
      >
        {aEnviar ? "A entrar..." : pedeCodigo ? "Confirmar código" : "Entrar"}
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
