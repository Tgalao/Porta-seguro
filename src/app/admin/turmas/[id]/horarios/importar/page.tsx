import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Turma } from "@/models";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { FormularioImportar } from "./formulario-importar";

export default async function PaginaImportarHorario({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirPerfil(["gestor", "admin"]);
  await ligarBaseDados();
  const { id } = await params;

  const turma = await Turma.findById(id).select("nome").lean();
  if (!turma) notFound();

  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao
        titulo={`Importar horário — ${turma.nome}`}
        voltarHref={`/admin/turmas/${id}`}
        voltarLabel={turma.nome}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <FormularioImportar turmaId={id} turmaNome={turma.nome} />
      </main>
    </div>
  );
}
