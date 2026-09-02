import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { limitesDoDiaEmLisboa, formatarHora } from "@/lib/datas";
import { Registo, Utilizador } from "@/models";
import { PainelPortaria } from "./painel-portaria";
import type { LinhaRegisto } from "./acoes";

/**
 * Ecrã da portaria (UC01): leitor de cartão, semáforo com a decisão e
 * tabela dos registos de hoje. Só porteiro e admin podem entrar aqui —
 * ver o exemplo de uso deixado em `exigirPerfil`.
 */
export default async function PaginaPortaria() {
  await exigirPerfil(["porteiro", "admin"]);
  await ligarBaseDados();

  const { inicio, fim } = limitesDoDiaEmLisboa(new Date());
  const registosHoje = await Registo.find({ dataHora: { $gte: inicio, $lt: fim } })
    .sort({ dataHora: -1 })
    .lean();

  // Uma só consulta para os nomes de todos os alunos que aparecem na
  // tabela, em vez de uma consulta por linha.
  const alunoIds = [...new Set(registosHoje.map((registo) => registo.alunoId.toString()))];
  const alunos = await Utilizador.find({ _id: { $in: alunoIds } })
    .select("nomeCompleto")
    .lean();
  const nomesPorId = new Map(alunos.map((aluno) => [aluno._id.toString(), aluno.nomeCompleto]));

  const linhasIniciais: LinhaRegisto[] = registosHoje.map((registo) => ({
    id: registo._id.toString(),
    alunoNome: nomesPorId.get(registo.alunoId.toString()) ?? "Aluno desconhecido",
    tipo: registo.tipo,
    estado: registo.estado,
    metodo: registo.metodo,
    horaFormatada: formatarHora(registo.dataHora),
  }));

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Portaria</h1>
      <PainelPortaria linhasIniciais={linhasIniciais} />
    </main>
  );
}
