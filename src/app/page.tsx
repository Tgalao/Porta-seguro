import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { LogoTexto } from "@/components/logo-texto";

/**
 * Página de entrada do site — pública, sem sessão iniciada.
 *
 * É o único ecrã que alguém de fora vê, por isso explica o que o sistema
 * faz antes de pedir credenciais. Quem já tem sessão vê o botão a apontar
 * para o painel em vez do login (não redireciona à força: alguém pode
 * querer chegar aqui de propósito).
 *
 * A identidade visual (azul institucional + cinzentos frios) é a mesma da
 * página do portão, para o site parecer todo do mesmo sítio.
 */
export default async function PaginaInicial() {
  const sessao = await auth();
  const autenticado = Boolean(sessao?.user);

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-10" />
            <div className="leading-tight">
              <LogoTexto className="h-5" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registo de entradas e saídas
              </p>
            </div>
          </div>

          <Link
            href={autenticado ? "/painel" : "/login"}
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-800"
          >
            {autenticado ? "Ir para o painel" : "Entrar"}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16">
        <section className="flex flex-col gap-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-700 dark:text-sky-400">
            Projeto UFCD 10790
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-balance sm:text-5xl">
            Quem entra e quem sai da escola, registado no momento.
          </h1>
          <p className="max-w-xl text-lg text-slate-600 dark:text-slate-300">
            Cartão ou código QR na portaria. O sistema confirma o horário da
            turma e decide se a saída pode acontecer, sem papel e sem
            depender da memória de ninguém.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href={autenticado ? "/painel" : "/login"}
              className="rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-sky-800"
            >
              {autenticado ? "Ir para o painel" : "Iniciar sessão"}
            </Link>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-3">
          <Destaque titulo="Entradas e saídas">
            Cada passagem fica registada com a hora, o método usado e a decisão
            que o sistema tomou.
          </Destaque>
          <Destaque titulo="Horários e assiduidade">
            Presenças, atrasos e faltas são sempre calculados a partir dos
            registos reais, nunca escritos à mão.
          </Destaque>
          <Destaque titulo="Código QR no telemóvel">
            Quem não tiver o cartão à mão gera um código válido durante dois
            minutos, de uso único.
          </Destaque>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 dark:border-slate-800">
        <p className="mx-auto w-full max-w-5xl px-6 text-xs text-slate-500 dark:text-slate-400">
          PortãoSeguro, projeto escolar da UFCD 10790, Projeto de Programação.
        </p>
      </footer>
    </div>
  );
}

function Destaque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-1.5 font-semibold">{titulo}</h2>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {children}
      </p>
    </div>
  );
}
