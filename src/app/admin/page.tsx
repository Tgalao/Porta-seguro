import Link from "next/link";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Curso, Turma, Utilizador } from "@/models";
import { CabecalhoSecao } from "@/components/cabecalho-secao";

/** Ecrã inicial da administração (UC03/RF08-RF10): atalhos para cada CRUD. */
export default async function PaginaAdmin() {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const [totalCursos, totalTurmas, totalAlunos] = await Promise.all([
    Curso.countDocuments(),
    Turma.countDocuments(),
    Utilizador.countDocuments({ perfil: "aluno" }),
  ]);

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao titulo="Administração" voltarHref="/painel" voltarLabel="Painel" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <CartaoSeccao href="/admin/cursos" titulo="Cursos" total={totalCursos} icone={<IconeCursos />} />
          <CartaoSeccao href="/admin/turmas" titulo="Turmas" total={totalTurmas} icone={<IconeTurmas />} />
          <CartaoSeccao href="/admin/alunos" titulo="Alunos" total={totalAlunos} icone={<IconeAlunos />} />
        </div>

        <Link
          href="/admin/simulacao"
          className="group mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-900/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 transition-colors group-hover:bg-teal-700 group-hover:text-white dark:bg-teal-950/50 dark:text-teal-400">
            <IconeSimulacao />
          </span>
          <div>
            <p className="font-semibold">Simulação de data/hora</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Demonstrar entradas e saídas noutro dia ou hora, para a defesa oral
            </p>
          </div>
        </Link>
      </main>
    </div>
  );
}

function CartaoSeccao({
  href,
  titulo,
  total,
  icone,
}: {
  href: string;
  titulo: string;
  total: number;
  icone: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-900/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 transition-colors group-hover:bg-teal-700 group-hover:text-white dark:bg-teal-950/50 dark:text-teal-400">
        {icone}
      </span>
      <div>
        <p className="text-2xl font-bold tabular-nums">{total}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{titulo}</p>
      </div>
    </Link>
  );
}

function IconeCursos() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <path
        d="M3 6.5 12 3l9 3.5-9 3.5-9-3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M6.5 9v5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M21 8.5v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconeTurmas() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconeSimulacao() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconeAlunos() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="2.8" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3 19c.9-3 3-4.6 6-4.6s5.1 1.6 6 4.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="17" cy="7.5" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14.8 13.2c2.4.3 3.9 1.6 4.6 3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
