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

export default async function PaginaEditarTurma({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();
  const { id } = await params;

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
    <main className="flex flex-1 flex-col gap-8 p-6">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Editar turma</h1>
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

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Horário semanal (RF10)</h2>
          <Link
            href={`/admin/turmas/${id}/horarios/novo`}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Novo bloco
          </Link>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-1 pr-4">Dia</th>
              <th className="py-1 pr-4">Início</th>
              <th className="py-1 pr-4">Fim</th>
              <th className="py-1 pr-4">Disciplina</th>
              <th className="py-1 pr-4">Professor(a)</th>
              <th className="py-1 pr-4">Sala</th>
              <th className="py-1 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {horarios.map((horario) => (
              <tr key={horario._id.toString()} className="border-b last:border-0">
                <td className="py-1 pr-4">{NOMES_DIAS_SEMANA[horario.diaSemana]}</td>
                <td className="py-1 pr-4">{horario.horaInicio}</td>
                <td className="py-1 pr-4">{horario.horaFim}</td>
                <td className="py-1 pr-4">{horario.disciplina}</td>
                <td className="py-1 pr-4">
                  {horario.professorId
                    ? (nomeProfessorPorId.get(horario.professorId.toString()) ?? "—")
                    : "—"}
                </td>
                <td className="py-1 pr-4">{horario.sala ?? "—"}</td>
                <td className="py-1 pr-4 text-right">
                  <Link
                    href={`/admin/turmas/${id}/horarios/${horario._id}`}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Editar
                  </Link>{" "}
                  <form action={removerHorario} className="inline">
                    <input type="hidden" name="id" value={horario._id.toString()} />
                    <input type="hidden" name="turmaId" value={id} />
                    <BotaoConfirmar
                      mensagem={`Remover o bloco de ${horario.disciplina} de ${NOMES_DIAS_SEMANA[horario.diaSemana]}?`}
                      className="ml-2 text-red-600 hover:underline dark:text-red-400"
                    >
                      Remover
                    </BotaoConfirmar>
                  </form>
                </td>
              </tr>
            ))}
            {horarios.length === 0 && (
              <tr>
                <td colSpan={7} className="py-3 text-center opacity-60">
                  Ainda sem horário definido.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
