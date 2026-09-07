import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { turmasDoUtilizador } from "@/lib/ambito";
import { Horario, Utilizador } from "@/models";
import { LinkVoltarPainel } from "@/components/link-voltar-painel";
import { HorarioSemanal, type BlocoHorario } from "@/components/horario-semanal";

/**
 * Horários das turmas, para quem dá ou coordena aulas:
 *
 *  - professor / diretor de turma -> as turmas onde tem blocos atribuídos;
 *  - coordenador -> as turmas dos cursos que coordena;
 *  - admin -> a escola toda.
 *
 * Não mostra assiduidade nenhuma — isso é o ecrã /consultas, e só o
 * coordenador e o admin lá chegam. Aqui é mesmo só o horário.
 */
export default async function PaginaHorarios() {
  const sessao = await exigirPerfil(["professor", "dt", "coordenador", "admin"]);
  await ligarBaseDados();

  const turmas = await turmasDoUtilizador(sessao.user.id, sessao.user.perfil);

  const blocos = await Horario.find({ turmaId: { $in: turmas.map((t) => t.id) } })
    .sort({ diaSemana: 1, horaInicio: 1 })
    .lean();

  // Uma só consulta para os nomes de todos os professores que aparecem.
  // O type guard explícito é preciso porque `.filter(Boolean)` não estreita
  // `string | undefined` para `string` aos olhos do TypeScript.
  const idsProfessores = [
    ...new Set(
      blocos
        .map((b) => b.professorId?.toString())
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const professores = await Utilizador.find({ _id: { $in: idsProfessores } })
    .select("nomeCompleto")
    .lean();
  const nomePorId = new Map(professores.map((p) => [p._id.toString(), p.nomeCompleto]));

  const blocosPorTurma = new Map<string, BlocoHorario[]>();
  for (const bloco of blocos) {
    const chave = bloco.turmaId.toString();
    const lista = blocosPorTurma.get(chave) ?? [];
    lista.push({
      diaSemana: bloco.diaSemana,
      horaInicio: bloco.horaInicio,
      horaFim: bloco.horaFim,
      disciplina: bloco.disciplina,
      sala: bloco.sala,
      professor: bloco.professorId ? nomePorId.get(bloco.professorId.toString()) : undefined,
    });
    blocosPorTurma.set(chave, lista);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <LinkVoltarPainel />
      <h1 className="text-2xl font-bold">Horários</h1>

      {turmas.length === 0 && (
        <p className="text-sm opacity-70">
          Ainda não tens turmas atribuídas. Fala com a administração para te
          associarem blocos de horário ou um curso a coordenar.
        </p>
      )}

      {turmas.map((turma) => (
        <section key={turma.id} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">
            {turma.nome} <span className="text-sm font-normal opacity-60">({turma.ano}.º ano)</span>
          </h2>
          <HorarioSemanal blocos={blocosPorTurma.get(turma.id) ?? []} mostrarProfessor />
        </section>
      ))}
    </main>
  );
}
