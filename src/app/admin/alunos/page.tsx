import Link from "next/link";
import type { Types } from "mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Utilizador, Turma } from "@/models";
import { removerAluno } from "./acoes";
import { BotaoConfirmar } from "../botao-confirmar";
import { CabecalhoSecao } from "@/components/cabecalho-secao";

export default async function PaginaAlunos({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  await exigirPerfil(["gestor", "admin"]);
  await ligarBaseDados();
  const { erro } = await searchParams;

  const alunos = await Utilizador.find({ perfil: "aluno" }).sort({ nomeCompleto: 1 }).lean();
  const idsTurmas = alunos
    .map((a) => a.turmaId)
    .filter((id): id is Types.ObjectId => Boolean(id));
  const turmas = await Turma.find({ _id: { $in: idsTurmas } })
    .select("nome")
    .lean();
  const nomeTurmaPorId = new Map(turmas.map((t) => [t._id.toString(), t.nome]));

  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao
        titulo="Alunos"
        voltarHref="/admin"
        voltarLabel="Administração"
        acao={
          <Link
            href="/admin/alunos/novo"
            className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-800"
          >
            + Novo aluno
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
                <th className="px-5 py-3 font-medium">Turma</th>
                <th className="px-5 py-3 font-medium">Cartão</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => (
                <tr
                  key={aluno._id.toString()}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="px-5 py-3 font-medium">{aluno.nomeCompleto}</td>
                  <td className="px-5 py-3">
                    {aluno.turmaId ? (nomeTurmaPorId.get(aluno.turmaId.toString()) ?? "—") : "—"}
                  </td>
                  <td className="px-5 py-3 font-mono tabular-nums">{aluno.numeroCartao ?? "—"}</td>
                  <td className="px-5 py-3">
                    {aluno.suspenso ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                        Suspenso
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/alunos/${aluno._id}`}
                      className="font-medium text-blue-700 hover:underline dark:text-blue-400"
                    >
                      Editar
                    </Link>{" "}
                    <form action={removerAluno} className="inline">
                      <input type="hidden" name="id" value={aluno._id.toString()} />
                      <BotaoConfirmar
                        mensagem={`Remover o aluno "${aluno.nomeCompleto}"? O histórico de registos e ocorrências dele também é apagado.`}
                        className="ml-2 font-medium text-red-600 hover:underline dark:text-red-400"
                      >
                        Remover
                      </BotaoConfirmar>
                    </form>
                  </td>
                </tr>
              ))}
              {alunos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                    Ainda sem alunos.
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
