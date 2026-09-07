import Link from "next/link";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { limitesDoDiaEmLisboa, formatarHora } from "@/lib/datas";
import { Registo, Utilizador, Turma } from "@/models";
import { PainelPortao } from "./painel-portao";
import type { CartaoParaSimular } from "./cartao-arrastavel";
import type { LinhaRegisto } from "./acoes";

/**
 * Portão Teste (UC01): simula a passagem de um cartão no leitor da
 * portaria, com semáforo e tabela dos registos do dia.
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

  // Os cartões que se podem simular. Numa portaria a sério o cartão é
  // físico; aqui escolhe-se de uma lista, que é o que faz desta página um
  // "portão de teste" e não o portão verdadeiro.
  const alunosComCartao = await Utilizador.find({
    perfil: "aluno",
    numeroCartao: { $exists: true, $ne: null },
  })
    .select("nomeCompleto numeroCartao numeroAluno fotoUrl turmaId")
    .sort({ nomeCompleto: 1 })
    .lean();

  const turmas = await Turma.find().select("nome").lean();
  const nomeTurmaPorId = new Map(turmas.map((turma) => [turma._id.toString(), turma.nome]));

  const cartoes: CartaoParaSimular[] = alunosComCartao.map((aluno) => ({
    id: aluno._id.toString(),
    nome: aluno.nomeCompleto,
    numeroCartao: aluno.numeroCartao ?? "",
    numeroAluno: aluno.numeroAluno,
    fotoUrl: aluno.fotoUrl,
    turma: aluno.turmaId ? nomeTurmaPorId.get(aluno.turmaId.toString()) : undefined,
  }));

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-teal-600/50 bg-teal-50 text-[9px] font-semibold uppercase text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
            >
              Logo
            </div>
            <div className="leading-tight">
              <h1 className="font-semibold">Portão Teste</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simulação da leitura na portaria
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
        <PainelPortao linhasIniciais={linhasIniciais} cartoes={cartoes} />
      </main>
    </div>
  );
}
