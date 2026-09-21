"use client";

import { useState, useTransition } from "react";
import { simularPassagem, confirmarSaidaSimulada } from "./acoes";
import type { AlunoResumo, ResultadoMovimento } from "@/lib/movimento";
import { SelectPersonalizado } from "@/components/select-personalizado";
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

/**
 * Data e hora ATUAIS deste computador ("do browser", como pedido) — não a
 * hora de Lisboa, de propósito: o formulário serve para poupar o
 * preenchimento manual quando se quer só testar "agora mesmo", e "agora
 * mesmo" é o relógio de quem está a usar o site, não um fuso fixo.
 */
function agoraNoBrowser(): { data: string; hora: string } {
  const agora = new Date();
  const doisDigitos = (n: number) => String(n).padStart(2, "0");
  return {
    data: `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`,
    hora: `${doisDigitos(agora.getHours())}:${doisDigitos(agora.getMinutes())}`,
  };
}

export function FormularioSimulacao({ alunos }: { alunos: AlunoParaSeletor[] }) {
  const [alunoId, setAlunoId] = useState(alunos[0]?.id ?? "");
  const [{ data, hora }, setDataHora] = useState(agoraNoBrowser);
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

  const opcoesAlunos = alunos.map((aluno) => ({
    valor: aluno.id,
    rotulo: aluno.turma ? `${aluno.nome} — ${aluno.turma}` : aluno.nome,
  }));

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={simular}
        className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <SelectPersonalizado
          rotulo="Aluno"
          valor={alunoId}
          onAlterar={setAlunoId}
          opcoes={opcoesAlunos}
        />

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Dia
            <input
              type="date"
              value={data}
              onChange={(evento) => setDataHora((atual) => ({ ...atual, data: evento.target.value }))}
              required
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Hora
            <input
              type="time"
              value={hora}
              onChange={(evento) => setDataHora((atual) => ({ ...atual, hora: evento.target.value }))}
              required
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
          <button
            type="button"
            onClick={() => setDataHora(agoraNoBrowser())}
            className="self-end rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:text-blue-400"
          >
            Agora
          </button>
        </div>

        <button
          type="submit"
          disabled={aEnviar || !alunoId}
          className="self-start rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
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
