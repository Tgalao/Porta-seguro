import Link from "next/link";
import type { Types } from "mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Curso, Turma, Utilizador } from "@/models";
import { removerCurso } from "./acoes";
import { BotaoConfirmar } from "../botao-confirmar";
import { CabecalhoSecao } from "@/components/cabecalho-secao";

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
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao
        titulo="Cursos"
        voltarHref="/admin"
        voltarLabel="Administração"
        acao={
          <Link
            href="/admin/cursos/novo"
            className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-800"
          >
            + Novo curso
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
                <th className="px-5 py-3 font-medium">Sigla</th>
                <th className="px-5 py-3 font-medium">Anos</th>
                <th className="px-5 py-3 font-medium">Coordenador</th>
                <th className="px-5 py-3 font-medium">Turmas</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {cursos.map((curso) => (
                <tr
                  key={curso._id.toString()}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="px-5 py-3 font-medium">{curso.nome}</td>
                  <td className="px-5 py-3">{curso.sigla}</td>
                  <td className="px-5 py-3 tabular-nums">{curso.anosDuracao}</td>
                  <td className="px-5 py-3">
                    {curso.coordenadorId
                      ? (nomeCoordenadorPorId.get(curso.coordenadorId.toString()) ?? "—")
                      : "—"}
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {turmasPorCurso.get(curso._id.toString()) ?? 0}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/cursos/${curso._id}`}
                      className="font-medium text-sky-700 hover:underline dark:text-sky-400"
                    >
                      Editar
                    </Link>{" "}
                    <form action={removerCurso} className="inline">
                      <input type="hidden" name="id" value={curso._id.toString()} />
                      <BotaoConfirmar
                        mensagem={`Remover o curso "${curso.nome}"?`}
                        className="ml-2 font-medium text-red-600 hover:underline dark:text-red-400"
                      >
                        Remover
                      </BotaoConfirmar>
                    </form>
                  </td>
                </tr>
              ))}
              {cursos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                    Ainda sem cursos.
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
