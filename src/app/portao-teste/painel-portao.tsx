"use client";

import { useState, useTransition } from "react";
import {
  confirmarSaidaComPais,
  lerCodigoQR,
  confirmarIdentidadeQR,
} from "./acoes";
import type { AlunoResumo, LinhaRegisto, ResultadoMovimento } from "@/lib/movimento";
import { LeitorQR } from "./leitor-qr";
import {
  CartaoAluno,
  EstadoPortaEHorario,
  Semaforo,
  BotaoResposta,
} from "@/components/semaforo-identificacao";

type Estado =
  | { passo: "vazio" }
  | { passo: "a-ler" }
  | { passo: "erro"; mensagem: string }
  | { passo: "resultado"; aluno: AlunoResumo; autorizado: boolean; motivo: string }
  | {
      passo: "pendente";
      aluno: AlunoResumo;
      motivo: string;
      horarioId?: string;
      momentoISO: string;
    }
  | { passo: "confirmar-identidade"; aluno: AlunoResumo };

const ROTULOS_ESTADO: Record<string, string> = {
  autorizado: "Autorizado",
  nao_autorizado: "Não autorizado",
  confirmado_pais: "Autorizado (pais)",
};

const ROTULOS_TIPO: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
};

/**
 * Tempo mínimo do ecrã "A ler...". O pedido ao servidor costuma ser mais
 * rápido do que isto; sem uma espera mínima, o resultado aparecia de
 * repente e não se percebia que tinha havido leitura nenhuma.
 */
const ESPERA_MINIMA_MS = 900;

export function PainelPortao({ linhasIniciais }: { linhasIniciais: LinhaRegisto[] }) {
  const [estado, setEstado] = useState<Estado>({ passo: "vazio" });
  const [linhas, setLinhas] = useState<LinhaRegisto[]>(linhasIniciais);
  const [aEnviar, iniciarTransicao] = useTransition();

  /** Comum ao caminho direto e à confirmação de identidade — ambos
   * devolvem o mesmo formato (ok / pendente / resultado final). */
  function aplicarResultadoIdentificacao(resultado: ResultadoMovimento) {
    if (!resultado.ok) {
      setEstado({ passo: "erro", mensagem: resultado.erro });
      return;
    }
    if (resultado.pendente) {
      setEstado({
        passo: "pendente",
        aluno: resultado.aluno,
        motivo: resultado.motivo,
        horarioId: resultado.horarioId,
        momentoISO: resultado.momentoISO,
      });
      return;
    }
    setEstado({
      passo: "resultado",
      aluno: resultado.aluno,
      autorizado: resultado.autorizado,
      motivo: resultado.motivo,
    });
    setLinhas((atuais) => [resultado.linha, ...atuais]);
  }

  function responderContactoPais(paisAutorizaram: boolean) {
    if (estado.passo !== "pendente") return;
    const { aluno, horarioId, momentoISO } = estado;

    iniciarTransicao(async () => {
      const resultado = await confirmarSaidaComPais(aluno.id, horarioId, momentoISO, paisAutorizaram);

      if (!resultado.ok) {
        setEstado({ passo: "erro", mensagem: resultado.erro });
        return;
      }

      setEstado({
        passo: "resultado",
        aluno,
        autorizado: resultado.autorizado,
        motivo: paisAutorizaram
          ? "Saída fora do horário confirmada por telefone com os pais."
          : "Pais contactados; saída não autorizada.",
      });
      setLinhas((atuais) => [resultado.linha, ...atuais]);
    });
  }

  function aoLerTokenQR(token: string) {
    setEstado({ passo: "a-ler" });

    iniciarTransicao(async () => {
      const [resultado] = await Promise.all([
        lerCodigoQR(token),
        new Promise((resolve) => setTimeout(resolve, ESPERA_MINIMA_MS)),
      ]);

      if (!resultado.ok) {
        setEstado({ passo: "erro", mensagem: resultado.erro });
        return;
      }
      setEstado({ passo: "confirmar-identidade", aluno: resultado.aluno });
    });
  }

  function responderIdentidade(eEsteAluno: boolean) {
    if (estado.passo !== "confirmar-identidade") return;
    const { aluno } = estado;

    iniciarTransicao(async () => {
      const resultado = await confirmarIdentidadeQR(aluno.id, eEsteAluno);

      if (!resultado.ok) {
        setEstado({ passo: "erro", mensagem: resultado.erro });
        return;
      }
      if ("identidadeRejeitada" in resultado) {
        // Nada foi registado — só a ocorrência (RF16) — por isso a tabela
        // de registos de hoje não muda.
        setEstado({
          passo: "resultado",
          aluno: resultado.aluno,
          autorizado: false,
          motivo: resultado.motivo,
        });
        return;
      }
      aplicarResultadoIdentificacao(resultado);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* --- Leitura do código QR ---------------------------------------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 font-semibold">Leitura de código QR</h2>

        {estado.passo === "vazio" && (
          <div className="flex flex-col items-center gap-3">
            <LeitorQR onLido={aoLerTokenQR} />
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Aponta a câmara ao código do telemóvel do aluno.
            </p>
          </div>
        )}

        {estado.passo === "a-ler" && (
          <div role="status" className="flex items-center justify-center gap-3 py-8">
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"
            />
            <p className="text-sm font-medium">A ler...</p>
          </div>
        )}

        {(estado.passo === "erro" ||
          estado.passo === "resultado" ||
          estado.passo === "confirmar-identidade" ||
          estado.passo === "pendente") && (
          <div className="flex flex-col gap-4">
            {estado.passo === "erro" && (
              <p className="rounded-xl border-l-4 border-red-600 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                {estado.mensagem}
              </p>
            )}

            {estado.passo === "resultado" && (
              <Semaforo cor={estado.autorizado ? "verde" : "vermelho"}>
                <CartaoAluno aluno={estado.aluno} />
                <p className="mt-2 text-sm">{estado.motivo}</p>
                <EstadoPortaEHorario aluno={estado.aluno} />
              </Semaforo>
            )}

            {estado.passo === "confirmar-identidade" && (
              <Semaforo cor="amarelo">
                <CartaoAluno aluno={estado.aluno} />
                <EstadoPortaEHorario aluno={estado.aluno} />
                <p className="mt-3 text-sm font-medium">É esta a pessoa à tua frente?</p>
                <div className="mt-2 flex gap-2">
                  <BotaoResposta onClick={() => responderIdentidade(true)} disabled={aEnviar}>
                    Sim
                  </BotaoResposta>
                  <BotaoResposta onClick={() => responderIdentidade(false)} disabled={aEnviar}>
                    Não é esta pessoa
                  </BotaoResposta>
                </div>
              </Semaforo>
            )}

            {estado.passo === "pendente" && (
              <Semaforo cor="amarelo">
                <CartaoAluno aluno={estado.aluno} />
                <p className="mt-2 text-sm">{estado.motivo}</p>
                <p className="mt-3 text-sm font-medium">Os pais autorizam a saída?</p>
                <div className="mt-2 flex gap-2">
                  <BotaoResposta onClick={() => responderContactoPais(true)} disabled={aEnviar}>
                    Sim
                  </BotaoResposta>
                  <BotaoResposta onClick={() => responderContactoPais(false)} disabled={aEnviar}>
                    Não
                  </BotaoResposta>
                </div>
              </Semaforo>
            )}

            {(estado.passo === "erro" || estado.passo === "resultado") && (
              <button
                type="button"
                onClick={() => setEstado({ passo: "vazio" })}
                className="self-start rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800"
              >
                Ler o próximo código
              </button>
            )}
          </div>
        )}
      </section>

      {/* --- Registos de hoje ------------------------------------------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Registos de hoje</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2 pr-4 font-medium">Hora</th>
                <th className="py-2 pr-4 font-medium">Aluno</th>
                <th className="py-2 pr-4 font-medium">Movimento</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500 dark:text-slate-400">
                    Ainda sem registos hoje.
                  </td>
                </tr>
              )}
              {linhas.map((linha) => (
                <tr
                  key={linha.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="py-2 pr-4 font-mono tabular-nums">{linha.horaFormatada}</td>
                  <td className="py-2 pr-4">
                    {linha.alunoNome}
                    {linha.metodo === "simulacao" && (
                      <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        Simulação
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">{ROTULOS_TIPO[linha.tipo]}</td>
                  <td className="py-2 pr-4">{ROTULOS_ESTADO[linha.estado]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
