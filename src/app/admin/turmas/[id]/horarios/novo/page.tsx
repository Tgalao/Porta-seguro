import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Utilizador } from "@/models";
import { FormularioHorario } from "../formulario-horario";
import { criarHorario } from "../acoes";
import { LinkVoltar } from "@/components/link-voltar";

export default async function PaginaNovoHorario({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();
  const { id: turmaId } = await params;

  const professores = await Utilizador.find({ perfil: { $in: ["professor", "dt"] } })
    .select("nomeCompleto")
    .sort({ nomeCompleto: 1 })
    .lean();

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <LinkVoltar href={`/admin/turmas/${turmaId}`} label="Editar turma" />
      <h1 className="text-2xl font-bold">Novo bloco de horário</h1>
      <FormularioHorario
        acao={criarHorario}
        turmaId={turmaId}
        professores={professores.map((p) => ({ id: p._id.toString(), nome: p.nomeCompleto }))}
      />
    </main>
  );
}
