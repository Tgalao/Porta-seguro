import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Turma } from "@/models";
import { FormularioAluno } from "../formulario-aluno";
import { criarAluno } from "../acoes";
import { LinkVoltar } from "@/components/link-voltar";

export default async function PaginaNovoAluno() {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const turmas = await Turma.find().select("nome").sort({ nome: 1 }).lean();

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <LinkVoltar href="/admin/alunos" label="Alunos" />
      <h1 className="text-2xl font-bold">Novo aluno</h1>
      <FormularioAluno
        acao={criarAluno}
        turmas={turmas.map((t) => ({ id: t._id.toString(), nome: t.nome }))}
      />
    </main>
  );
}
