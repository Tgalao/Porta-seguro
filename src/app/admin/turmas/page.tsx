import Link from "next/link";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Turma, Curso, Utilizador } from "@/models";
import { removerTurma } from "./acoes";
import { BotaoConfirmar } from "../botao-confirmar";

export default async function PaginaTurmas() {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

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
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Turmas</h1>
        <Link
          href="/admin/turmas/novo"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nova turma
        </Link>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1 pr-4">Nome</th>
            <th className="py-1 pr-4">Ano</th>
            <th className="py-1 pr-4">Curso</th>
            <th className="py-1 pr-4">Alunos</th>
            <th className="py-1 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {turmas.map((turma) => (
            <tr key={turma._id.toString()} className="border-b last:border-0">
              <td className="py-1 pr-4">{turma.nome}</td>
              <td className="py-1 pr-4">{turma.ano}</td>
              <td className="py-1 pr-4">{nomeCursoPorId.get(turma.cursoId.toString()) ?? "—"}</td>
              <td className="py-1 pr-4">{alunosPorTurma.get(turma._id.toString()) ?? 0}</td>
              <td className="py-1 pr-4 text-right">
                <Link
                  href={`/admin/turmas/${turma._id}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  Editar / horários
                </Link>{" "}
                <form action={removerTurma} className="inline">
                  <input type="hidden" name="id" value={turma._id.toString()} />
                  <BotaoConfirmar
                    mensagem={`Remover a turma "${turma.nome}"? Os horários dela também são removidos e os alunos ficam sem turma.`}
                    className="ml-2 text-red-600 hover:underline dark:text-red-400"
                  >
                    Remover
                  </BotaoConfirmar>
                </form>
              </td>
            </tr>
          ))}
          {turmas.length === 0 && (
            <tr>
              <td colSpan={5} className="py-3 text-center opacity-60">
                Ainda sem turmas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
