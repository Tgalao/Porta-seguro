import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Curso, Utilizador } from "@/models";
import { FormularioCurso } from "../formulario-curso";
import { atualizarCurso } from "../acoes";
import { CabecalhoSecao } from "@/components/cabecalho-secao";

export default async function PaginaEditarCurso({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();
  const { id } = await params;

  const [curso, coordenadores] = await Promise.all([
    Curso.findById(id).lean(),
    Utilizador.find({ perfil: "coordenador" }).select("nomeCompleto").sort({ nomeCompleto: 1 }).lean(),
  ]);

  if (!curso) notFound();

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao titulo="Editar curso" voltarHref="/admin/cursos" voltarLabel="Cursos" />

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <FormularioCurso
            acao={atualizarCurso}
            coordenadores={coordenadores.map((c) => ({ id: c._id.toString(), nome: c.nomeCompleto }))}
            cursoInicial={{
              id: curso._id.toString(),
              nome: curso.nome,
              sigla: curso.sigla,
              anosDuracao: curso.anosDuracao,
              coordenadorId: curso.coordenadorId?.toString(),
            }}
          />
        </div>
      </main>
    </div>
  );
}
