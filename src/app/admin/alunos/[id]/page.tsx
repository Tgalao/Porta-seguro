import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Utilizador, Turma } from "@/models";
import { FormularioAluno } from "../formulario-aluno";
import { atualizarAluno } from "../acoes";
import { CabecalhoSecao } from "@/components/cabecalho-secao";

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
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao
        titulo={`Editar aluno — ${aluno.nomeCompleto}`}
        voltarHref="/admin/alunos"
        voltarLabel="Alunos"
      />

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
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
        </div>
      </main>
    </div>
  );
}
