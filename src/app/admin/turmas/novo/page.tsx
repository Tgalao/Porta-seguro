import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Curso, Utilizador } from "@/models";
import { FormularioTurma } from "../formulario-turma";
import { criarTurma } from "../acoes";
import { CabecalhoSecao } from "@/components/cabecalho-secao";

export default async function PaginaNovaTurma() {
  await exigirPerfil(["gestor", "admin"]);
  await ligarBaseDados();

  const [cursos, diretores] = await Promise.all([
    Curso.find().select("nome").sort({ nome: 1 }).lean(),
    Utilizador.find({ perfil: "dt" }).select("nomeCompleto").sort({ nomeCompleto: 1 }).lean(),
  ]);

  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao titulo="Nova turma" voltarHref="/admin/turmas" voltarLabel="Turmas" />

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <FormularioTurma
            acao={criarTurma}
            cursos={cursos.map((c) => ({ id: c._id.toString(), nome: c.nome }))}
            diretores={diretores.map((d) => ({ id: d._id.toString(), nome: d.nomeCompleto }))}
          />
        </div>
      </main>
    </div>
  );
}
