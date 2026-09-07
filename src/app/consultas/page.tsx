import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { partesEmLisboa } from "@/lib/datas";
import { Utilizador } from "@/models";
import { turmasDoUtilizador } from "@/lib/ambito";
import { FiltroConsulta } from "./filtro-consulta";
import { CabecalhoSecao } from "@/components/cabecalho-secao";

/**
 * Ecrã de consultas e listagem (UC02/UC04): assiduidade por aluno, por
 * turma ou por ano de formação, com exportação em PDF (RF06/RF07/RF11).
 *
 * Só admin e coordenador. O porteiro não entra: identifica quem passa na
 * portaria, mas não acompanha o histórico de faltas de ninguém.
 */
export default async function PaginaConsultas() {
  const sessao = await exigirPerfil(["coordenador", "admin"]);
  await ligarBaseDados();

  // O coordenador só vê as turmas dos cursos que coordena; o admin vê tudo.
  const turmas = await turmasDoUtilizador(sessao.user.id, sessao.user.perfil);

  const alunos = await Utilizador.find({
    perfil: "aluno",
    turmaId: { $in: turmas.map((turma) => turma.id) },
  })
    .select("nomeCompleto numeroAluno")
    .sort({ nomeCompleto: 1 })
    .lean();

  const anos = [...new Set(turmas.map((turma) => turma.ano))].sort((a, b) => a - b);
  const { ano, mes } = partesEmLisboa(new Date());
  const mesAtual = `${ano}-${String(mes).padStart(2, "0")}`;

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao titulo="Consultas de assiduidade" voltarHref="/painel" voltarLabel="Painel" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {turmas.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ainda não tens turmas atribuídas para consultar.
          </p>
        ) : (
          <FiltroConsulta
            alunos={alunos.map((a) => ({ id: a._id.toString(), nome: a.nomeCompleto }))}
            turmas={turmas.map((t) => ({ id: t.id, nome: t.nome }))}
            anos={anos}
            mesInicial={mesAtual}
            podeExportar
          />
        )}
      </main>
    </div>
  );
}
