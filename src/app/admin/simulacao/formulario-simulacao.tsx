"use client";

import { useState, useTransition } from "react";
import { simularPassagem, confirmarSaidaSimulada } from "./acoes";
import type { AlunoResumo, ResultadoMovimento } from "@/lib/movimento";
import {
  CartaoAluno,
  EstadoPortaEHorario,
  Semaforo,
  BotaoResposta,
} from "@/components/semaforo-identificacao";

export interface AlunoParaSeletor {
  id: string;
  nome: string;
  turma?: string;
}

type Estado =
  | { passo: "formulario" }
  | { passo: "erro"; mensagem: string }
  | { passo: "resultado"; aluno: AlunoResumo; autorizado: boolean; motivo: string }
  | {
      passo: "pendente";
      aluno: AlunoResumo;
      motivo: string;
      horarioId?: string;
      momentoISO: string;
    };

/** "2026-09-09" — data de hoje, em Lisboa, para pré-preencher o formulário. */
function dataDeHojeEmLisboa(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

export function FormularioSimulacao({ alunos }: { alunos: AlunoParaSeletor[] }) {
  const [alunoId, setAlunoId] = useState(alunos[0]?.id ?? "");
  const [data, setData] = useState(dataDeHojeEmLisboa());
  const [hora, setHora] = useState("08:30");
  const [estado, setEstado] = useState<Estado>({ passo: "formulario" });
  const [aEnviar, iniciarTransicao] = useTransition();

  function aplicarResultado(resultado: ResultadoMovimento) {
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
  }

  function simular(evento: React.FormEvent) {
    evento.preventDefault();
    if (!alunoId) return;

    iniciarTransicao(async () => {
      const resultado = await simularPassagem(alunoId, data, hora);
      aplicarResultado(resultado);
    });
  }

  function responderContactoPais(paisAutorizaram: boolean) {
    if (estado.passo !== "pendente") return;
    const { aluno, horarioId, momentoISO } = estado;

    iniciarTransicao(async () => {
      const resultado = await confirmarSaidaSimulada(aluno.id, horarioId, momentoISO, paisAutorizaram);

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
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={simular}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <label htmlFor="aluno" className="mb-1 block text-sm font-medium">
            Aluno
          </label>
          <select
            id="aluno"
            value={alunoId}
            onChange={(evento) => setAlunoId(evento.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {alunos.map((aluno) => (
              <option key={aluno.id} value={aluno.id}>
                {aluno.nome}
                {aluno.turma ? ` — ${aluno.turma}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="data" className="mb-1 block text-sm font-medium">
              Dia
            </label>
            <input
              id="data"
              type="date"
              value={data}
              onChange={(evento) => setData(evento.target.value)}
              required
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label htmlFor="hora" className="mb-1 block text-sm font-medium">
              Hora
            </label>
            <input
              id="hora"
              type="time"
              value={hora}
              onChange={(evento) => setHora(evento.target.value)}
              required
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={aEnviar || !alunoId}
          className="self-start rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-50"
        >
          {aEnviar ? "A simular..." : "Simular passagem"}
        </button>
      </form>

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
    </div>
  );
}
