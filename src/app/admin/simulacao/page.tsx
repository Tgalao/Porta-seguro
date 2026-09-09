import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Utilizador, Turma } from "@/models";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { FormularioSimulacao, type AlunoParaSeletor } from "./formulario-simulacao";

/**
 * Ferramenta de simulação de data/hora (só admin — RF15/RF16 fora do
 * momento real): permite demonstrar entradas e saídas em dias e horas
 * diferentes do agora, para a defesa oral. Os registos criados aqui ficam
 * sempre marcados como simulação (ver `./acoes.ts`).
 */
export default async function PaginaSimulacao() {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const alunos = await Utilizador.find({ perfil: "aluno" })
    .select("nomeCompleto turmaId")
    .sort({ nomeCompleto: 1 })
    .lean();
  const turmas = await Turma.find().select("nome").lean();
  const nomeTurmaPorId = new Map(turmas.map((t) => [t._id.toString(), t.nome]));

  const alunosParaSeletor: AlunoParaSeletor[] = alunos.map((aluno) => ({
    id: aluno._id.toString(),
    nome: aluno.nomeCompleto,
    turma: aluno.turmaId ? nomeTurmaPorId.get(aluno.turmaId.toString()) : undefined,
  }));

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao
        titulo="Simulação de data/hora"
        subtitulo="Só para demonstração — não é uma entrada/saída real"
        voltarHref="/admin"
        voltarLabel="Administração"
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <p className="mb-6 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Esta ferramenta aplica as mesmas regras do Portão Teste (horário da
          turma, atrasos, suspensões, autorização de saída), mas à data e
          hora que escolheres, em vez do momento real. Os registos criados
          aqui ficam marcados como <strong>Simulação</strong> e nunca contam
          para a assiduidade real de nenhum aluno.
        </p>

        <FormularioSimulacao alunos={alunosParaSeletor} />
      </main>
    </div>
  );
}
