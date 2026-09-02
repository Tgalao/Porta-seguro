"use client";

import { useState, useTransition } from "react";
import { consultarAssiduidade } from "./acoes";
import type { Ambito, ResultadoConsulta } from "./logica";

interface Opcao {
  id: string;
  nome: string;
}

const ROTULOS_SITUACAO: Record<string, string> = {
  presenca: "Presença",
  presenca_atraso: "Presença (atraso)",
  falta: "Falta",
};

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
      <form onSubmit={consultar} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Âmbito
          <select
            value={ambito}
            onChange={(e) => mudarAmbito(e.target.value as Ambito)}
            className="rounded border px-3 py-2"
          >
            <option value="aluno">Por aluno</option>
            <option value="turma">Por turma</option>
            <option value="ano">Por ano de formação</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {ambito === "aluno" ? "Aluno" : ambito === "turma" ? "Turma" : "Ano"}
          <select
            value={alvo}
            onChange={(e) => setAlvo(e.target.value)}
            className="min-w-48 rounded border px-3 py-2"
          >
            {opcoesAtuais.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Mês
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={aEnviar || !alvo}
          className="rounded border px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
        >
          Consultar
        </button>

        {podeExportar && resultado?.ok && (
          <a
            href={`/api/relatorios/pdf?ambito=${ambito}&alvo=${alvo}&mes=${mes}`}
            className="rounded border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          >
            Exportar PDF
          </a>
        )}
      </form>

      {resultado && !resultado.ok && (
        <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {resultado.erro}
        </p>
      )}

      {resultado?.ok && (
        <>
          <h2 className="text-lg font-semibold">{resultado.alvoNome}</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile rotulo="Dias letivos" valor={resultado.resumo.diasLetivos} />
            <Tile rotulo="Presenças" valor={resultado.resumo.presencas} />
            <Tile rotulo="Atrasos" valor={resultado.resumo.atrasos} />
            <Tile rotulo="Faltas" valor={resultado.resumo.faltas} />
          </div>
          <p className="text-sm opacity-70">
            Taxa de presença: {(resultado.resumo.taxaPresenca * 100).toFixed(1)}%
          </p>

          {resultado.ambito === "aluno" ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-1 pr-4">Dia</th>
                  <th className="py-1 pr-4">Situação</th>
                </tr>
              </thead>
              <tbody>
                {resultado.dias.map((dia, indice) => (
                  <tr key={indice} className="border-b last:border-0">
                    <td className="py-1 pr-4">{dia.dataFormatada}</td>
                    <td className="py-1 pr-4">{ROTULOS_SITUACAO[dia.situacao]}</td>
                  </tr>
                ))}
                {resultado.dias.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-3 text-center opacity-60">
                      Sem dias letivos neste mês.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-1 pr-4">Aluno</th>
                  <th className="py-1 pr-4">Turma</th>
                  <th className="py-1 pr-4">Presenças</th>
                  <th className="py-1 pr-4">Atrasos</th>
                  <th className="py-1 pr-4">Faltas</th>
                  <th className="py-1 pr-4">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {resultado.alunos.map((linha) => (
                  <tr key={linha.alunoId} className="border-b last:border-0">
                    <td className="py-1 pr-4">{linha.nome}</td>
                    <td className="py-1 pr-4">{linha.turma ?? "—"}</td>
                    <td className="py-1 pr-4">{linha.resumo.presencas}</td>
                    <td className="py-1 pr-4">{linha.resumo.atrasos}</td>
                    <td className="py-1 pr-4">{linha.resumo.faltas}</td>
                    <td className="py-1 pr-4">{(linha.resumo.taxaPresenca * 100).toFixed(0)}%</td>
                  </tr>
                ))}
                {resultado.alunos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-3 text-center opacity-60">
                      Sem alunos neste âmbito.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

function Tile({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded border p-3">
      <p className="text-2xl font-bold">{valor}</p>
      <p className="text-sm opacity-70">{rotulo}</p>
    </div>
  );
}
