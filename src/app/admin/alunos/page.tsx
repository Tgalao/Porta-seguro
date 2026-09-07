import Link from "next/link";
import type { Types } from "mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Utilizador, Turma } from "@/models";
import { removerAluno } from "./acoes";
import { BotaoConfirmar } from "../botao-confirmar";

export default async function PaginaAlunos({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  await exigirPerfil(["admin"]);
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
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Alunos</h1>
        <Link
          href="/admin/alunos/novo"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Novo aluno
        </Link>
      </div>

      {erro && (
        <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1 pr-4">Nome</th>
            <th className="py-1 pr-4">Turma</th>
            <th className="py-1 pr-4">Cartão</th>
            <th className="py-1 pr-4">Estado</th>
            <th className="py-1 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {alunos.map((aluno) => (
            <tr key={aluno._id.toString()} className="border-b last:border-0">
              <td className="py-1 pr-4">{aluno.nomeCompleto}</td>
              <td className="py-1 pr-4">
                {aluno.turmaId ? (nomeTurmaPorId.get(aluno.turmaId.toString()) ?? "—") : "—"}
              </td>
              <td className="py-1 pr-4">{aluno.numeroCartao ?? "—"}</td>
              <td className="py-1 pr-4">
                {aluno.suspenso && (
                  <span className="text-red-600 dark:text-red-400">Suspenso</span>
                )}
                {!aluno.suspenso && "—"}
              </td>
              <td className="py-1 pr-4 text-right">
                <Link
                  href={`/admin/alunos/${aluno._id}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  Editar
                </Link>{" "}
                <form action={removerAluno} className="inline">
                  <input type="hidden" name="id" value={aluno._id.toString()} />
                  <BotaoConfirmar
                    mensagem={`Remover o aluno "${aluno.nomeCompleto}"? O histórico de registos e ocorrências dele também é apagado.`}
                    className="ml-2 text-red-600 hover:underline dark:text-red-400"
                  >
                    Remover
                  </BotaoConfirmar>
                </form>
              </td>
            </tr>
          ))}
          {alunos.length === 0 && (
            <tr>
              <td colSpan={5} className="py-3 text-center opacity-60">
                Ainda sem alunos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
