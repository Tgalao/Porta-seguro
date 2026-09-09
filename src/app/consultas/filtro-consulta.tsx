"use client";

import { useState, useTransition } from "react";
import { consultarAssiduidade } from "./acoes";
import type { Ambito, ResultadoConsulta } from "./logica";
import { SelectPersonalizado } from "@/components/select-personalizado";

interface Opcao {
  id: string;
  nome: string;
}

const ROTULOS_SITUACAO: Record<string, string> = {
  presenca: "Presença",
  presenca_atraso: "Presença (atraso)",
  falta: "Falta",
};

const CLASSE_CAMPO =
  "rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-transparent";

export function FiltroConsulta({
  alunos,
  turmas,
  anos,
  mesInicial,
  podeExportar,
}: {
  alunos: Opcao[];
  turmas: Opcao[];
  anos: number[];
  mesInicial: string;
  podeExportar: boolean;
}) {
  const [ambito, setAmbito] = useState<Ambito>("aluno");
  const [alvo, setAlvo] = useState(alunos[0]?.id ?? "");
  const [mes, setMes] = useState(mesInicial);
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const [aEnviar, iniciarTransicao] = useTransition();

  function opcoesParaAmbito(valor: Ambito): Array<{ valor: string; rotulo: string }> {
    if (valor === "aluno") return alunos.map((a) => ({ valor: a.id, rotulo: a.nome }));
    if (valor === "turma") return turmas.map((t) => ({ valor: t.id, rotulo: t.nome }));
    return anos.map((a) => ({ valor: String(a), rotulo: `${a}º ano` }));
  }

  function mudarAmbito(novo: Ambito) {
    setAmbito(novo);
    setAlvo(opcoesParaAmbito(novo)[0]?.valor ?? "");
    setResultado(null);
  }

  function consultar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    iniciarTransicao(async () => {
      const novoResultado = await consultarAssiduidade(ambito, alvo, mes);
      setResultado(novoResultado);
    });
  }

  const opcoesAtuais = opcoesParaAmbito(ambito);

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={consultar}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:flex-wrap sm:items-end dark:border-slate-800 dark:bg-slate-900"
      >
        <SelectPersonalizado
          rotulo="Âmbito"
          valor={ambito}
          onAlterar={(v) => mudarAmbito(v as Ambito)}
          opcoes={[
            { valor: "aluno", rotulo: "Por aluno" },
            { valor: "turma", rotulo: "Por turma" },
            { valor: "ano", rotulo: "Por ano de formação" },
          ]}
          className="w-full sm:w-auto"
        />

        <SelectPersonalizado
          rotulo={ambito === "aluno" ? "Aluno" : ambito === "turma" ? "Turma" : "Ano"}
          valor={alvo}
          onAlterar={setAlvo}
          opcoes={opcoesAtuais.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))}
          className="w-full sm:w-auto sm:min-w-48"
        />

        <label className="flex w-full flex-col gap-1 text-sm sm:w-auto">
          Mês
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className={`w-full ${CLASSE_CAMPO}`}
          />
        </label>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button
            type="submit"
            disabled={aEnviar || !alvo}
            className="flex-1 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50 sm:flex-none"
          >
            {aEnviar ? "A consultar..." : "Consultar"}
          </button>

          {podeExportar && resultado?.ok && (
            <a
              href={`/api/relatorios/pdf?ambito=${ambito}&alvo=${alvo}&mes=${mes}`}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-center text-sm transition hover:bg-slate-100 sm:flex-none dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Exportar PDF
            </a>
          )}
        </div>
      </form>

      {resultado && !resultado.ok && (
        <p className="rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {resultado.erro}
        </p>
      )}

      {resultado?.ok && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 font-semibold">{resultado.alvoNome}</h2>

          <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile rotulo="Dias letivos" valor={resultado.resumo.diasLetivos} />
            <Tile rotulo="Presenças" valor={resultado.resumo.presencas} destaque="ok" />
            <Tile rotulo="Atrasos" valor={resultado.resumo.atrasos} destaque="aviso" />
            <Tile rotulo="Faltas" valor={resultado.resumo.faltas} destaque="critico" />
          </div>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Taxa de presença: {(resultado.resumo.taxaPresenca * 100).toFixed(1)}%
          </p>

          <div className="overflow-x-auto">
            {resultado.ambito === "aluno" ? (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2 pr-4 font-medium">Dia</th>
                    <th className="py-2 pr-4 font-medium">Situação</th>
                    <th className="py-2 pr-4 font-medium">Entrada</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.dias.map((dia, indice) => (
                    <tr
                      key={indice}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <td className="py-2 pr-4 font-mono tabular-nums">{dia.dataFormatada}</td>
                      <td className="py-2 pr-4">{ROTULOS_SITUACAO[dia.situacao]}</td>
                      <td className="py-2 pr-4 font-mono tabular-nums">
                        {dia.horaEntradaFormatada ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {resultado.dias.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500 dark:text-slate-400">
                        Sem dias letivos neste mês.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2 pr-4 font-medium">Aluno</th>
                    <th className="py-2 pr-4 font-medium">Turma</th>
                    <th className="py-2 pr-4 font-medium">Presenças</th>
                    <th className="py-2 pr-4 font-medium">Atrasos</th>
                    <th className="py-2 pr-4 font-medium">Faltas</th>
                    <th className="py-2 pr-4 font-medium">Taxa</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.alunos.map((linha) => (
                    <tr
                      key={linha.alunoId}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <td className="py-2 pr-4 font-medium">{linha.nome}</td>
                      <td className="py-2 pr-4">{linha.turma ?? "—"}</td>
                      <td className="py-2 pr-4 tabular-nums">{linha.resumo.presencas}</td>
                      <td className="py-2 pr-4 tabular-nums">{linha.resumo.atrasos}</td>
                      <td className="py-2 pr-4 tabular-nums">{linha.resumo.faltas}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {(linha.resumo.taxaPresenca * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                  {resultado.alunos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 dark:text-slate-400">
                        Sem alunos neste âmbito.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Tile({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: number;
  destaque?: "ok" | "aviso" | "critico";
}) {
  const cores = {
    ok: "text-emerald-700 dark:text-emerald-400",
    aviso: "text-amber-700 dark:text-amber-400",
    critico: "text-red-700 dark:text-red-400",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
      <p className={`text-2xl font-bold tabular-nums ${destaque ? cores[destaque] : ""}`}>{valor}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{rotulo}</p>
    </div>
  );
}
