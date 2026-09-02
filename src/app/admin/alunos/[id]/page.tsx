import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Utilizador, Turma } from "@/models";
import { FormularioAluno } from "../formulario-aluno";
import { atualizarAluno } from "../acoes";

export default async function PaginaEditarAluno({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();
  const { id } = await params;

  const [aluno, turmas] = await Promise.all([
    Utilizador.findOne({ _id: id, perfil: "aluno" }).lean(),
    Turma.find().select("nome").sort({ nome: 1 }).lean(),
  ]);

  if (!aluno) notFound();

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Editar aluno</h1>
      <FormularioAluno
        acao={atualizarAluno}
        turmas={turmas.map((t) => ({ id: t._id.toString(), nome: t.nome }))}
        alunoInicial={{
          id: aluno._id.toString(),
          nomeCompleto: aluno.nomeCompleto,
          email: aluno.email,
          numeroAluno: aluno.numeroAluno,
          numeroCartao: aluno.numeroCartao,
          turmaId: aluno.turmaId?.toString(),
          maiorIdade: aluno.maiorIdade,
          autorizacaoPais: aluno.autorizacaoPais,
          suspenso: aluno.suspenso,
        }}
      />
    </main>
  );
}
