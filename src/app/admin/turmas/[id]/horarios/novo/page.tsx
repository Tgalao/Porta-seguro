import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Utilizador } from "@/models";
import { FormularioHorario } from "../formulario-horario";
import { criarHorario } from "../acoes";
import { CabecalhoSecao } from "@/components/cabecalho-secao";

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
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao
        titulo="Novo bloco de horário"
        voltarHref={`/admin/turmas/${turmaId}`}
        voltarLabel="Editar turma"
      />

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <FormularioHorario
            acao={criarHorario}
            turmaId={turmaId}
            professores={professores.map((p) => ({ id: p._id.toString(), nome: p.nomeCompleto }))}
          />
        </div>
      </main>
    </div>
  );
}
