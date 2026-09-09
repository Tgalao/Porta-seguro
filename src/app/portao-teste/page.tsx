import Link from "next/link";
import { Logo } from "@/components/logo";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { limitesDoDiaEmLisboa, formatarHora } from "@/lib/datas";
import { Registo, Utilizador } from "@/models";
import { PainelPortao } from "./painel-portao";
import type { LinhaRegisto } from "@/lib/movimento";

/**
 * Portão Teste (UC01): leitura de código QR na portaria, com semáforo e
 * tabela dos registos do dia.
 *
 * Só porteiro e admin — é aqui que se cria um registo de entrada/saída
 * verdadeiro, por isso o acesso é o mesmo do ecrã de portaria de sempre.
 */
export default async function PaginaPortaoTeste() {
  await exigirPerfil(["porteiro", "admin"]);
  await ligarBaseDados();

  const { inicio, fim } = limitesDoDiaEmLisboa(new Date());
  const registosHoje = await Registo.find({ dataHora: { $gte: inicio, $lt: fim } })
    .sort({ dataHora: -1 })
    .lean();

  // Uma só consulta para os nomes de todos os alunos que aparecem na
  // tabela, em vez de uma consulta por linha.
  const alunoIds = [...new Set(registosHoje.map((registo) => registo.alunoId.toString()))];
  const alunos = await Utilizador.find({ _id: { $in: alunoIds } })
    .select("nomeCompleto")
    .lean();
  const nomesPorId = new Map(alunos.map((aluno) => [aluno._id.toString(), aluno.nomeCompleto]));

  const linhasIniciais: LinhaRegisto[] = registosHoje.map((registo) => ({
    id: registo._id.toString(),
    alunoNome: nomesPorId.get(registo.alunoId.toString()) ?? "Aluno desconhecido",
    tipo: registo.tipo,
    estado: registo.estado,
    metodo: registo.metodo,
    horaFormatada: formatarHora(registo.dataHora),
  }));

  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-blue-50 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="leading-tight">
              <h1 className="font-semibold">Portão Teste</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Leitura de código QR na portaria
              </p>
            </div>
          </div>

          <Link
            href="/painel"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            ← Painel
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <PainelPortao linhasIniciais={linhasIniciais} />
      </main>
    </div>
  );
}
