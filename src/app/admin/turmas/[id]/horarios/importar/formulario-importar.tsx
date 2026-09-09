"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { analisarExcel, confirmarImportacao } from "./acoes";
import type { LinhaImportada } from "@/lib/importarHorario";
import { NOMES_DIAS_SEMANA } from "@/lib/datas";

type Estado =
  | { passo: "escolher" }
  | { passo: "a-analisar" }
  | { passo: "erro"; mensagem: string }
  | { passo: "previsualizar"; linhas: LinhaImportada[] }
  | { passo: "concluido"; total: number };

export function FormularioImportar({ turmaId, turmaNome }: { turmaId: string; turmaNome: string }) {
  const [estado, setEstado] = useState<Estado>({ passo: "escolher" });
  const [passkey, setPasskey] = useState("");
  const [aEnviar, iniciarTransicao] = useTransition();
  const inputFicheiroRef = useRef<HTMLInputElement>(null);

  function analisar(evento: React.FormEvent) {
    evento.preventDefault();
    const ficheiro = inputFicheiroRef.current?.files?.[0];
    if (!ficheiro) return;

    setEstado({ passo: "a-analisar" });
    iniciarTransicao(async () => {
      const formData = new FormData();
      formData.set("ficheiro", ficheiro);
      const resultado = await analisarExcel(turmaId, formData);

      if (!resultado.ok) {
        setEstado({ passo: "erro", mensagem: resultado.erro });
        return;
      }
      setEstado({ passo: "previsualizar", linhas: resultado.linhas });
    });
  }

  function confirmar(linhas: LinhaImportada[]) {
    if (!passkey) return;
    iniciarTransicao(async () => {
      const resultado = await confirmarImportacao(turmaId, linhas, passkey);
      if (!resultado.ok) {
        setEstado({ passo: "erro", mensagem: resultado.erro });
        return;
      }
      setEstado({ passo: "concluido", total: resultado.total });
    });
  }

  if (estado.passo === "escolher" || estado.passo === "a-analisar") {
    return (
      <form
        onSubmit={analisar}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <a
          href="/api/horarios/modelo"
          className="self-start rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
        >
          ⬇ Descarregar modelo (.xlsx)
        </a>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Ficheiro Excel (.xlsx)</span>
          <input
            ref={inputFicheiroRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:border-blue-400 dark:border-slate-700 dark:text-slate-400"
          />
        </label>

        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <p className="mb-1 font-medium text-slate-600 dark:text-slate-300">
            Colunas esperadas (cabeçalho na 1.ª linha, ordem livre):
          </p>
          <p className="font-mono">Dia · Início · Fim · Disciplina · Professor · Sala</p>
          <p className="mt-1">
            &quot;Dia&quot; aceita o nome (Segunda-feira) ou o número (1). &quot;Professor&quot; é
            opcional, mas tem de ser igual ao nome de uma conta já existente.
          </p>
        </div>

        <button
          type="submit"
          disabled={aEnviar}
          className="self-start rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
        >
          {aEnviar ? "A analisar..." : "Analisar ficheiro"}
        </button>
      </form>
    );
  }

  if (estado.passo === "erro") {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl border-l-4 border-red-600 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {estado.mensagem}
        </p>
        <button
          type="button"
          onClick={() => setEstado({ passo: "escolher" })}
          className="self-start rounded-lg border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Tentar outro ficheiro
        </button>
      </div>
    );
  }

  if (estado.passo === "concluido") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-5 dark:bg-emerald-950">
        <p className="font-semibold text-emerald-900 dark:text-emerald-100">
          Horário de {turmaNome} importado: {estado.total}{" "}
          {estado.total === 1 ? "bloco" : "blocos"}.
        </p>
        <Link
          href={`/admin/turmas/${turmaId}`}
          className="self-start rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800"
        >
          Ver a turma
        </Link>
      </div>
    );
  }

  // passo === "previsualizar"
  const { linhas } = estado;
  const linhasValidas = linhas.filter((l) => l.erros.length === 0);
  const linhasComErro = linhas.filter((l) => l.erros.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {linhasValidas.length} {linhasValidas.length === 1 ? "linha válida" : "linhas válidas"}
        </span>
        {linhasComErro.length > 0 && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
            {linhasComErro.length} {linhasComErro.length === 1 ? "linha com erro" : "linhas com erro"}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="px-4 py-2 font-medium">Linha</th>
              <th className="px-4 py-2 font-medium">Dia</th>
              <th className="px-4 py-2 font-medium">Início</th>
              <th className="px-4 py-2 font-medium">Fim</th>
              <th className="px-4 py-2 font-medium">Disciplina</th>
              <th className="px-4 py-2 font-medium">Professor</th>
              <th className="px-4 py-2 font-medium">Sala</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr
                key={linha.numeroLinha}
                className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${
                  linha.erros.length > 0 ? "bg-red-50/60 dark:bg-red-950/20" : ""
                }`}
              >
                <td className="px-4 py-2 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {linha.numeroLinha}
                </td>
                {linha.erros.length > 0 ? (
                  <td colSpan={6} className="px-4 py-2 text-red-700 dark:text-red-300">
                    {linha.erros.join(" ")}
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-2">
                      {linha.diaSemana !== undefined ? NOMES_DIAS_SEMANA[linha.diaSemana] : "—"}
                    </td>
                    <td className="px-4 py-2 font-mono tabular-nums">{linha.horaInicio}</td>
                    <td className="px-4 py-2 font-mono tabular-nums">{linha.horaFim}</td>
                    <td className="px-4 py-2">{linha.disciplina}</td>
                    <td className="px-4 py-2">{linha.professorNome ?? "—"}</td>
                    <td className="px-4 py-2">{linha.sala ?? "—"}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {linhasValidas.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            Isto vai <strong>substituir todo o horário atual</strong> de {turmaNome} pelas{" "}
            {linhasValidas.length} linhas válidas acima
            {linhasComErro.length > 0 ? " (as linhas com erro ficam de fora)" : ""}.
          </p>
          <label className="flex max-w-xs flex-col gap-1 text-sm">
            Palavra-chave de confirmação
            <input
              type="password"
              value={passkey}
              onChange={(evento) => setPasskey(evento.target.value)}
              autoComplete="off"
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => confirmar(linhas)}
              disabled={aEnviar || !passkey}
              className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              {aEnviar ? "A importar..." : "Confirmar importação"}
            </button>
            <button
              type="button"
              onClick={() => setEstado({ passo: "escolher" })}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEstado({ passo: "escolher" })}
          className="self-start rounded-lg border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Nenhuma linha válida — tentar outro ficheiro
        </button>
      )}
    </div>
  );
}
