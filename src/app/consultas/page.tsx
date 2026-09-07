import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { partesEmLisboa } from "@/lib/datas";
import { Utilizador } from "@/models";
import { turmasDoUtilizador } from "@/lib/ambito";
import { FiltroConsulta } from "./filtro-consulta";
import { LinkVoltarPainel } from "@/components/link-voltar-painel";

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
    <main className="flex flex-1 flex-col gap-6 p-6">
      <LinkVoltarPainel />
      <h1 className="text-2xl font-bold">Consultas de assiduidade</h1>

      {turmas.length === 0 ? (
        <p className="text-sm opacity-70">
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
  );
}
