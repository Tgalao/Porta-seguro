import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Curso, Utilizador } from "@/models";
import { FormularioTurma } from "../formulario-turma";
import { criarTurma } from "../acoes";

export default async function PaginaNovaTurma() {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const [cursos, diretores] = await Promise.all([
    Curso.find().select("nome").sort({ nome: 1 }).lean(),
    Utilizador.find({ perfil: "dt" }).select("nomeCompleto").sort({ nomeCompleto: 1 }).lean(),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Nova turma</h1>
      <FormularioTurma
        acao={criarTurma}
        cursos={cursos.map((c) => ({ id: c._id.toString(), nome: c.nome }))}
        diretores={diretores.map((d) => ({ id: d._id.toString(), nome: d.nomeCompleto }))}
      />
    </main>
  );
}
