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
      <div className="w-full max-w-sm rounded-lg border p-6">
        <h1 className="mb-1 text-center text-2xl font-bold">PortãoSeguro</h1>
        <p className="mb-6 text-center text-sm opacity-70">
          Inicia sessão para continuar
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
            className="w-full rounded border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          >
            Entrar com conta Google
          </button>
        </form>
      </div>
    </main>
  );
}
