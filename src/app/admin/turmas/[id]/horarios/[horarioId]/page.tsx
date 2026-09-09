import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Horario, Utilizador } from "@/models";
import { FormularioHorario } from "../formulario-horario";
import { atualizarHorario } from "../acoes";
import { CabecalhoSecao } from "@/components/cabecalho-secao";

export default async function PaginaEditarHorario({
  params,
}: {
  params: Promise<{ id: string; horarioId: string }>;
}) {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();
  const { id: turmaId, horarioId } = await params;

  const [horario, professores] = await Promise.all([
    Horario.findById(horarioId).lean(),
    Utilizador.find({ perfil: { $in: ["professor", "dt"] } })
      .select("nomeCompleto")
      .sort({ nomeCompleto: 1 })
      .lean(),
  ]);

  if (!horario) notFound();

  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao
        titulo="Editar bloco de horário"
        voltarHref={`/admin/turmas/${turmaId}`}
        voltarLabel="Editar turma"
      />

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <FormularioHorario
            acao={atualizarHorario}
            turmaId={turmaId}
            professores={professores.map((p) => ({ id: p._id.toString(), nome: p.nomeCompleto }))}
            horarioInicial={{
              id: horario._id.toString(),
              diaSemana: horario.diaSemana,
              horaInicio: horario.horaInicio,
              horaFim: horario.horaFim,
              disciplina: horario.disciplina,
              professorId: horario.professorId?.toString(),
              sala: horario.sala,
            }}
          />
        </div>
      </main>
    </div>
  );
}
