import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { partesEmLisboa } from "@/lib/datas";
import { Utilizador, Turma } from "@/models";
import { FiltroConsulta } from "./filtro-consulta";
import { LinkVoltarPainel } from "@/components/link-voltar-painel";

/**
 * Ecrã de consultas e listagem (UC02/UC04): assiduidade por aluno, por
 * turma ou por ano de formação, com exportação em PDF (RF06/RF07/RF11).
 */
export default async function PaginaConsultas() {
  const sessao = await exigirPerfil(["porteiro", "admin"]);
  await ligarBaseDados();

  const [alunos, turmas] = await Promise.all([
    Utilizador.find({ perfil: "aluno" })
      .select("nomeCompleto numeroAluno")
      .sort({ nomeCompleto: 1 })
      .lean(),
    Turma.find().select("nome ano").sort({ nome: 1 }).lean(),
  ]);

  const anos = [...new Set(turmas.map((turma) => turma.ano))].sort((a, b) => a - b);
  const { ano, mes } = partesEmLisboa(new Date());
  const mesAtual = `${ano}-${String(mes).padStart(2, "0")}`;

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <LinkVoltarPainel />
      <h1 className="text-2xl font-bold">Consultas de assiduidade</h1>
      <FiltroConsulta
        alunos={alunos.map((a) => ({ id: a._id.toString(), nome: a.nomeCompleto }))}
        turmas={turmas.map((t) => ({ id: t._id.toString(), nome: t.nome }))}
        anos={anos}
        mesInicial={mesAtual}
        podeExportar={sessao.user.perfil === "admin"}
      />
    </main>
  );
}
