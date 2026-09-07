"use client";

import { useEffect, useState, useTransition } from "react";
import { gerarNovoTokenQR, type TokenGerado } from "./acoes";

/** Quantos segundos faltam até `validoAteISO`, nunca negativo. */
function segundosRestantes(validoAteISO: string): number {
  const restam = Math.round((new Date(validoAteISO).getTime() - Date.now()) / 1000);
  return Math.max(0, restam);
}

export function GeradorQR({ tokenInicial }: { tokenInicial: TokenGerado | null }) {
  const [token, setToken] = useState<TokenGerado | null>(tokenInicial);
  const [segundos, setSegundos] = useState(() =>
    tokenInicial ? segundosRestantes(tokenInicial.validoAteISO) : 0,
  );
  const [aGerar, iniciarTransicao] = useTransition();

  // Conta o tempo a partir de `validoAteISO` (não de um contador local), para
  // não desacertar se o separador ficar em segundo plano uns segundos.
  useEffect(() => {
    if (!token) return;
    const intervalo = setInterval(() => {
      setSegundos(segundosRestantes(token.validoAteISO));
    }, 1000);
    return () => clearInterval(intervalo);
  }, [token]);

  function gerar() {
    iniciarTransicao(async () => {
      const novo = await gerarNovoTokenQR();
      setToken(novo);
      setSegundos(segundosRestantes(novo.validoAteISO));
    });
  }

  const expirado = token !== null && segundos <= 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {token && !expirado && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem gerada localmente (data URL), não faz sentido otimizar com next/image */}
          <img
            src={token.imagemDataUrl}
            alt="Código QR para a portaria"
            width={240}
            height={240}
            className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"
          />
          <p className="rounded-full bg-teal-50 px-3 py-1 font-mono text-sm tabular-nums text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
            Válido por mais {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, "0")}
          </p>
        </>
      )}

      {expirado && (
        <p className="text-sm text-red-600 dark:text-red-400">Este código expirou.</p>
      )}

      <button
        type="button"
        onClick={gerar}
        disabled={aGerar}
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-50"
      >
        {aGerar ? "A gerar..." : token ? "Gerar novo código" : "Gerar código QR"}
      </button>
    </div>
  );
}
