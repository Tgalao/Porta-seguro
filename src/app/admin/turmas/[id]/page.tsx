import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { NOMES_DIAS_SEMANA } from "@/lib/datas";
import { Turma, Curso, Utilizador, Horario } from "@/models";
import { FormularioTurma } from "../formulario-turma";
import { atualizarTurma } from "../acoes";
import { removerHorario } from "./horarios/acoes";
import { BotaoConfirmar } from "../../botao-confirmar";
import { CabecalhoSecao } from "@/components/cabecalho-secao";

export default async function PaginaEditarTurma({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();
  const { id } = await params;
  const { erro } = await searchParams;

  const [turma, cursos, diretores, professores, horarios] = await Promise.all([
    Turma.findById(id).lean(),
    Curso.find().select("nome").sort({ nome: 1 }).lean(),
    Utilizador.find({ perfil: "dt" }).select("nomeCompleto").sort({ nomeCompleto: 1 }).lean(),
    Utilizador.find({ perfil: { $in: ["professor", "dt"] } }).select("nomeCompleto").lean(),
    Horario.find({ turmaId: id }).sort({ diaSemana: 1, horaInicio: 1 }).lean(),
  ]);

  if (!turma) notFound();

  const nomeProfessorPorId = new Map(professores.map((p) => [p._id.toString(), p.nomeCompleto]));

  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao
        titulo={`Editar turma — ${turma.nome}`}
        voltarHref="/admin/turmas"
        voltarLabel="Turmas"
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <FormularioTurma
            acao={atualizarTurma}
            cursos={cursos.map((c) => ({ id: c._id.toString(), nome: c.nome }))}
            diretores={diretores.map((d) => ({ id: d._id.toString(), nome: d.nomeCompleto }))}
            turmaInicial={{
              id: turma._id.toString(),
              nome: turma.nome,
              ano: turma.ano,
              cursoId: turma.cursoId.toString(),
              diretorTurmaId: turma.diretorTurmaId?.toString(),
            }}
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          {erro && (
            <p className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              {erro}
            </p>
          )}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Horário semanal (RF10)</h2>
            <Link
              href={`/admin/turmas/${id}/horarios/novo`}
              className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-800"
            >
              + Novo bloco
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-4 font-medium">Dia</th>
                  <th className="py-2 pr-4 font-medium">Início</th>
                  <th className="py-2 pr-4 font-medium">Fim</th>
                  <th className="py-2 pr-4 font-medium">Disciplina</th>
                  <th className="py-2 pr-4 font-medium">Professor(a)</th>
                  <th className="py-2 pr-4 font-medium">Sala</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {horarios.map((horario) => (
                  <tr
                    key={horario._id.toString()}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="py-2 pr-4">{NOMES_DIAS_SEMANA[horario.diaSemana]}</td>
                    <td className="py-2 pr-4 font-mono tabular-nums">{horario.horaInicio}</td>
                    <td className="py-2 pr-4 font-mono tabular-nums">{horario.horaFim}</td>
                    <td className="py-2 pr-4">{horario.disciplina}</td>
                    <td className="py-2 pr-4">
                      {horario.professorId
                        ? (nomeProfessorPorId.get(horario.professorId.toString()) ?? "—")
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">{horario.sala ?? "—"}</td>
                    <td className="py-2 pr-4 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/turmas/${id}/horarios/${horario._id}`}
                        className="font-medium text-blue-700 hover:underline dark:text-blue-400"
                      >
                        Editar
                      </Link>{" "}
                      <form action={removerHorario} className="inline">
                        <input type="hidden" name="id" value={horario._id.toString()} />
                        <input type="hidden" name="turmaId" value={id} />
                        <BotaoConfirmar
                          mensagem={`Remover o bloco de ${horario.disciplina} de ${NOMES_DIAS_SEMANA[horario.diaSemana]}?`}
                          className="ml-2 font-medium text-red-600 hover:underline dark:text-red-400"
                        >
                          Remover
                        </BotaoConfirmar>
                      </form>
                    </td>
                  </tr>
                ))}
                {horarios.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500 dark:text-slate-400">
                      Ainda sem horário definido.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
