import Image from "next/image";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { FormularioCredenciais } from "./formulario-credenciais";
import { entrarComGoogle } from "./acoes";

export default async function PaginaLogin() {
  // Quem já tem sessão iniciada não precisa de ver o login outra vez.
  // (O middleware já faz este mesmo redirecionamento antes de chegar aqui;
  // repetimos por segurança, caso esta página seja alguma vez usada de
  // outra forma.)
  const sessao = await auth();
  if (sessao?.user) {
    redirect("/painel");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="relative w-full max-w-sm rounded-lg border p-6">
        <Image
          src="/logo-escola.png"
          alt="Escola Comércio Lisboa"
          width={1400}
          height={596}
          className="absolute top-4 right-4 h-6 w-auto opacity-90"
        />

        <h1 className="mb-1 text-center text-2xl font-bold">PortãoSeguro</h1>
        <p className="mb-1 text-center text-sm opacity-70">
          Inicia sessão para continuar
        </p>
        {/* Este sistema ainda é um projeto de curso, não uma aplicação
         * adotada pela direção da escola — a nota deixa isso claro para
         * quem vir a página, mesmo com o logótipo da escola presente. */}
        <p className="mb-6 text-center text-xs opacity-50">
          Projeto UFCD 10790 — Escola Comércio Lisboa
        </p>

        <FormularioCredenciais />

        <div className="my-6 flex items-center gap-3 text-xs opacity-50">
          <div className="h-px flex-1 bg-current" />
          ou
          <div className="h-px flex-1 bg-current" />
        </div>

        <form action={entrarComGoogle}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          >
            <LogoGoogle />
            Entrar com conta Google
          </button>
        </form>
      </div>
    </main>
  );
}

/** Logótipo oficial da Google ("G" de quatro cores), usado no botão de login. */
function LogoGoogle() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.27a12 12 0 0 0 0 10.76l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}
