import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { LogoTexto } from "@/components/logo-texto";
import { redirect } from "next/navigation";
import { FormularioCredenciais } from "./formulario-credenciais";
import { entrarComGoogle } from "./acoes";

/**
 * Mensagens para os códigos de erro que o Auth.js acrescenta ao URL
 * (`/login?error=...`) quando o login falha antes de haver sessão — o
 * caso mais comum é o `signIn` callback (src/auth.ts) recusar uma conta
 * Google sem `Utilizador` correspondente na escola.
 *
 * Sem isto, uma tentativa falhada com o Google não mostrava nada: a
 * pessoa ficava a olhar para o formulário vazio, sem perceber que a
 * entrada tinha sido recusada — e se por acaso já tivesse uma sessão
 * antiga válida noutra aba, parecia que "o Google a tinha deixado entrar"
 * quando na verdade só continuava a ver essa sessão antiga.
 */
const MENSAGENS_ERRO_LOGIN: Record<string, string> = {
  AccessDenied:
    "Esta conta Google não tem acesso ao PortãoSeguro. Só entra quem já tiver uma conta criada na escola — fala com a administração.",
  Configuration: "Erro de configuração do login. Tenta novamente mais tarde.",
};

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Quem já tem sessão iniciada não precisa de ver o login outra vez.
  // (O middleware já faz este mesmo redirecionamento antes de chegar aqui;
  // repetimos por segurança, caso esta página seja alguma vez usada de
  // outra forma.)
  const sessao = await auth();
  if (sessao?.user) {
    redirect("/painel");
  }

  const { error } = await searchParams;
  const mensagemErro = error
    ? (MENSAGENS_ERRO_LOGIN[error] ?? "Não foi possível iniciar sessão. Tenta novamente.")
    : null;

  return (
    <div className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-blue-50 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex w-full max-w-3xl items-center px-6 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400"
          >
            ← Página principal
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <Logo className="h-11 w-11" decorativa />
            <h1>
              <LogoTexto className="h-7" />
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Inicia sessão para continuar
            </p>
          </div>

          {mensagemErro && (
            <p className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              {mensagemErro}
            </p>
          )}

          <FormularioCredenciais />

          <div className="my-6 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            ou
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          <form action={entrarComGoogle}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <LogoGoogle />
              Entrar com conta Google
            </button>
          </form>
        </div>
      </main>
    </div>
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
