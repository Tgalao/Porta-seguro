import Link from "next/link";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Turma, Curso, Utilizador } from "@/models";
import { removerTurma } from "./acoes";
import { BotaoConfirmar } from "../botao-confirmar";
import { CabecalhoSecao } from "@/components/cabecalho-secao";

export default async function PaginaTurmas({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  await exigirPerfil(["gestor", "admin"]);
  await ligarBaseDados();
  const { erro } = await searchParams;

  const turmas = await Turma.find().sort({ nome: 1 }).lean();
  const cursos = await Curso.find({ _id: { $in: turmas.map((t) => t.cursoId) } })
    .select("nome sigla")
    .lean();
  const nomeCursoPorId = new Map(cursos.map((c) => [c._id.toString(), `${c.nome} (${c.sigla})`]));

  const contagemAlunos = await Utilizador.aggregate([
    { $match: { perfil: "aluno", turmaId: { $in: turmas.map((t) => t._id) } } },
    { $group: { _id: "$turmaId", total: { $sum: 1 } } },
  ]);
  const alunosPorTurma = new Map(
    contagemAlunos.map((linha: { _id: unknown; total: number }) => [String(linha._id), linha.total]),
  );

  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao
        titulo="Turmas"
        voltarHref="/admin"
        voltarLabel="Administração"
        acao={
          <Link
            href="/admin/turmas/novo"
            className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-800"
          >
            + Nova turma
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {erro && (
          <p className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {erro}
          </p>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Ano</th>
                <th className="px-5 py-3 font-medium">Curso</th>
                <th className="px-5 py-3 font-medium">Alunos</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {turmas.map((turma) => (
                <tr
                  key={turma._id.toString()}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="px-5 py-3 font-medium">{turma.nome}</td>
                  <td className="px-5 py-3 tabular-nums">{turma.ano}</td>
                  <td className="px-5 py-3">{nomeCursoPorId.get(turma.cursoId.toString()) ?? "—"}</td>
                  <td className="px-5 py-3 tabular-nums">
                    {alunosPorTurma.get(turma._id.toString()) ?? 0}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/turmas/${turma._id}`}
                      className="font-medium text-blue-700 hover:underline dark:text-blue-400"
                    >
                      Editar / horários
                    </Link>{" "}
                    <form action={removerTurma} className="inline">
                      <input type="hidden" name="id" value={turma._id.toString()} />
                      <BotaoConfirmar
                        mensagem={`Remover a turma "${turma.nome}"? Os horários dela também são removidos e os alunos ficam sem turma.`}
                        className="ml-2 font-medium text-red-600 hover:underline dark:text-red-400"
                      >
                        Remover
                      </BotaoConfirmar>
                    </form>
                  </td>
                </tr>
              ))}
              {turmas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                    Ainda sem turmas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
