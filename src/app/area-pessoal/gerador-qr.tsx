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
            className="rounded border"
          />
          <p className="text-sm opacity-70">
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
        className="rounded border px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
      >
        {token ? "Gerar novo código" : "Gerar código QR"}
      </button>
    </div>
  );
}
