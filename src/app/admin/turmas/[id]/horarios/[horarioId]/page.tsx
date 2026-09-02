import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Horario, Utilizador } from "@/models";
import { FormularioHorario } from "../formulario-horario";
import { atualizarHorario } from "../acoes";

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
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Editar bloco de horário</h1>
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
    </main>
  );
}
