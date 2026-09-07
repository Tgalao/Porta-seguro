import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Utilizador } from "@/models";
import { FormularioCurso } from "../formulario-curso";
import { criarCurso } from "../acoes";
import { CabecalhoSecao } from "@/components/cabecalho-secao";

export default async function PaginaNovoCurso() {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const coordenadores = await Utilizador.find({ perfil: "coordenador" })
    .select("nomeCompleto")
    .sort({ nomeCompleto: 1 })
    .lean();

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao titulo="Novo curso" voltarHref="/admin/cursos" voltarLabel="Cursos" />

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <FormularioCurso
            acao={criarCurso}
            coordenadores={coordenadores.map((c) => ({ id: c._id.toString(), nome: c.nomeCompleto }))}
          />
        </div>
      </main>
    </div>
  );
}
