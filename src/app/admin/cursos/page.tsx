import Link from "next/link";
import type { Types } from "mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Curso, Turma, Utilizador } from "@/models";
import { removerCurso } from "./acoes";
import { BotaoConfirmar } from "../botao-confirmar";

export default async function PaginaCursos({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();
  const { erro } = await searchParams;

  const cursos = await Curso.find().sort({ nome: 1 }).lean();

  const idsCoordenadores = cursos
    .map((c) => c.coordenadorId)
    .filter((id): id is Types.ObjectId => Boolean(id));
  const coordenadores = await Utilizador.find({ _id: { $in: idsCoordenadores } })
    .select("nomeCompleto")
    .lean();
  const nomeCoordenadorPorId = new Map(
    coordenadores.map((c) => [c._id.toString(), c.nomeCompleto]),
  );

  const turmas = await Turma.find({ cursoId: { $in: cursos.map((c) => c._id) } })
    .select("cursoId")
    .lean();
  const turmasPorCurso = new Map<string, number>();
  for (const turma of turmas) {
    const chave = turma.cursoId.toString();
    turmasPorCurso.set(chave, (turmasPorCurso.get(chave) ?? 0) + 1);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cursos</h1>
        <Link
          href="/admin/cursos/novo"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Novo curso
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
            <th className="py-1 pr-4">Sigla</th>
            <th className="py-1 pr-4">Anos</th>
            <th className="py-1 pr-4">Coordenador</th>
            <th className="py-1 pr-4">Turmas</th>
            <th className="py-1 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {cursos.map((curso) => (
            <tr key={curso._id.toString()} className="border-b last:border-0">
              <td className="py-1 pr-4">{curso.nome}</td>
              <td className="py-1 pr-4">{curso.sigla}</td>
              <td className="py-1 pr-4">{curso.anosDuracao}</td>
              <td className="py-1 pr-4">
                {curso.coordenadorId
                  ? (nomeCoordenadorPorId.get(curso.coordenadorId.toString()) ?? "—")
                  : "—"}
              </td>
              <td className="py-1 pr-4">{turmasPorCurso.get(curso._id.toString()) ?? 0}</td>
              <td className="py-1 pr-4 text-right">
                <Link href={`/admin/cursos/${curso._id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                  Editar
                </Link>{" "}
                <form action={removerCurso} className="inline">
                  <input type="hidden" name="id" value={curso._id.toString()} />
                  <BotaoConfirmar
                    mensagem={`Remover o curso "${curso.nome}"?`}
                    className="ml-2 text-red-600 hover:underline dark:text-red-400"
                  >
                    Remover
                  </BotaoConfirmar>
                </form>
              </td>
            </tr>
          ))}
          {cursos.length === 0 && (
            <tr>
              <td colSpan={6} className="py-3 text-center opacity-60">
                Ainda sem cursos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
