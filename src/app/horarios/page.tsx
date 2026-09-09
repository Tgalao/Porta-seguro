import Link from "next/link";
import { Logo } from "@/components/logo";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { turmasDoUtilizador } from "@/lib/ambito";
import { Horario, Utilizador } from "@/models";
import type { TurmaComHorario } from "./seletor-turma";
import { VistaHorario, type ProfessorComHorario } from "./vista-horario";
import type { BlocoHorario } from "@/components/horario-semanal";

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
export default async function PaginaHorarios({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const sessao = await exigirPerfil(["professor", "dt", "coordenador", "admin"]);
  await ligarBaseDados();
  const { vista } = await searchParams;
  const vistaInicial = vista === "pessoal" ? "pessoal" : vista === "turma" ? "turma" : undefined;

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
  const nomeTurmaPorId = new Map(turmas.map((t) => [t.id, t.nome]));

  // Duas formas de agrupar os MESMOS blocos: por turma (o dia inteiro de
  // uma turma, várias disciplinas e professores) e por professor (só as
  // aulas de uma pessoa, em turmas diferentes) — ver VistaHorario.
  const blocosPorTurma = new Map<string, BlocoHorario[]>();
  const blocosPorProfessor = new Map<string, BlocoHorario[]>();
  for (const bloco of blocos) {
    const chaveTurma = bloco.turmaId.toString();
    const blocoPronto: BlocoHorario = {
      diaSemana: bloco.diaSemana,
      horaInicio: bloco.horaInicio,
      horaFim: bloco.horaFim,
      disciplina: bloco.disciplina,
      sala: bloco.sala,
      professor: bloco.professorId ? nomePorId.get(bloco.professorId.toString()) : undefined,
      turma: nomeTurmaPorId.get(chaveTurma),
    };

    const listaTurma = blocosPorTurma.get(chaveTurma) ?? [];
    listaTurma.push(blocoPronto);
    blocosPorTurma.set(chaveTurma, listaTurma);

    if (bloco.professorId) {
      const chaveProfessor = bloco.professorId.toString();
      const listaProfessor = blocosPorProfessor.get(chaveProfessor) ?? [];
      listaProfessor.push(blocoPronto);
      blocosPorProfessor.set(chaveProfessor, listaProfessor);
    }
  }

  // Junta o horário de cada turma aos dados que o seletor precisa — feito
  // aqui, no servidor, para o componente de cliente não ter de ir buscar
  // nada à rede quando se troca de turma.
  const turmasComHorario: TurmaComHorario[] = turmas.map((turma) => ({
    id: turma.id,
    nome: turma.nome,
    ano: turma.ano,
    blocos: blocosPorTurma.get(turma.id) ?? [],
  }));

  // "O meu horário": só para quem tem perfil professor, e só as próprias
  // aulas. "Por professor": só para o admin, que pode escolher qualquer um.
  const meuHorario =
    sessao.user.perfil === "professor" ? (blocosPorProfessor.get(sessao.user.id) ?? []) : undefined;
  const professoresComHorario: ProfessorComHorario[] | undefined =
    sessao.user.perfil === "admin"
      ? idsProfessores
          .map((id) => ({ id, nome: nomePorId.get(id) ?? "—", blocos: blocosPorProfessor.get(id) ?? [] }))
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-PT"))
      : undefined;

  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-blue-50 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="leading-tight">
              <h1 className="font-semibold">Horário de turmas</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {turmas.length} {turmas.length === 1 ? "turma" : "turmas"} atribuídas
              </p>
            </div>
          </div>

          <Link
            href="/painel"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            ← Painel
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {turmas.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ainda não tens turmas atribuídas. Fala com a administração para te
            associarem blocos de horário ou um curso a coordenar.
          </p>
        ) : (
          <VistaHorario
            turmas={turmasComHorario}
            meuHorario={meuHorario}
            professores={professoresComHorario}
            vistaInicial={vistaInicial}
          />
        )}
      </main>
    </div>
  );
}
