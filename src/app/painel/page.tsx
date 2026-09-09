import Link from "next/link";
import { Logo } from "@/components/logo";
import { LogoTexto } from "@/components/logo-texto";
import { exigirSessao } from "@/lib/permissoes";
import { signOut } from "@/auth";
import type { Perfil } from "@/lib/constantes";

interface AtalhoDoPainel {
  href: string;
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
  perfis: Perfil[];
}

const ATALHOS: AtalhoDoPainel[] = [
  {
    href: "/portao-teste",
    titulo: "Portão Teste",
    descricao: "Simular a leitura de um cartão ou código QR na portaria.",
    icone: <IconePorta />,
    perfis: ["porteiro", "admin"],
  },
  {
    href: "/consultas",
    titulo: "Consultar assiduidade",
    descricao: "Presenças, atrasos e faltas das turmas que coordenas.",
    icone: <IconeGrafico />,
    perfis: ["coordenador", "admin"],
  },
  {
    href: "/horarios?vista=pessoal",
    titulo: "O meu horário",
    descricao: "As tuas próprias aulas, dia a dia, nas turmas onde lecionas.",
    icone: <IconeCalendario />,
    perfis: ["professor"],
  },
  {
    href: "/horarios?vista=turma",
    titulo: "Horário de turmas",
    descricao: "O horário semanal das turmas a que estás associado.",
    icone: <IconeCalendario />,
    perfis: ["dt", "coordenador", "admin"],
  },
  {
    href: "/horarios?vista=pessoal",
    titulo: "Horário de professores",
    descricao: "Ver as aulas de qualquer professor, dia a dia.",
    icone: <IconeCalendario />,
    perfis: ["admin"],
  },
  {
    href: "/admin",
    titulo: "Administração",
    descricao: "Gerir cursos, turmas, horários e contas de alunos.",
    icone: <IconeEngrenagem />,
    perfis: ["admin"],
  },
  {
    href: "/area-pessoal",
    titulo: "A minha área",
    descricao: "Código QR, o teu horário e a tua assiduidade.",
    icone: <IconeUtilizador />,
    perfis: ["aluno"],
  },
];

/**
 * Painel principal — o primeiro ecrã depois do login. Mostra só os
 * atalhos relevantes para o perfil de quem entrou; cada perfil vê um
 * subconjunto diferente de ATALHOS, nunca a lista toda.
 */
export default async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const sessao = await exigirSessao();
  const { erro } = await searchParams;

  const atalhosVisiveis = ATALHOS.filter((atalho) => atalho.perfis.includes(sessao.user.perfil));

  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-blue-50 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="leading-tight">
              <LogoTexto className="h-5" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Painel</p>
            </div>
          </div>

          <form
            action={async () => {
              "use server";
              // Volta à página principal (não ao login): é aí que o site
              // pede para entrar outra vez, e permite reconsiderar antes de
              // voltar a autenticar-se.
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Terminar sessão
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sessão iniciada como</p>
          <h1 className="text-2xl font-bold">{sessao.user.name}</h1>
          <p className="text-sm text-blue-700 dark:text-blue-400">{ROTULO_PERFIL[sessao.user.perfil]}</p>
        </div>

        {erro === "sem-permissao" && (
          <p className="rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            Não tens permissão para aceder a essa página.
          </p>
        )}

        {atalhosVisiveis.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ainda não há nada configurado para o teu perfil.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {atalhosVisiveis.map((atalho) => (
              <Link
                key={atalho.href}
                href={atalho.href}
                className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-700 group-hover:text-white dark:bg-blue-950/50 dark:text-blue-400">
                  {atalho.icone}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold">{atalho.titulo}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {atalho.descricao}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const ROTULO_PERFIL: Record<Perfil, string> = {
  aluno: "Aluno",
  porteiro: "Porteiro",
  professor: "Professor",
  dt: "Diretor(a) de turma",
  coordenador: "Coordenador(a)",
  admin: "Administrador",
};

function IconePorta() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <rect x="4" y="3" width="13" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="13.5" cy="12" r="1" fill="currentColor" />
      <path d="M17 8v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconeGrafico() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M4 20V4M4 20h16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 16v-4M12.5 16V8M17 16v-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconeCalendario() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconeEngrenagem() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.55 1.55M7.15 16.85 5.6 18.4M18.4 18.4l-1.55-1.55M7.15 7.15 5.6 5.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconeUtilizador() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.5 20c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
