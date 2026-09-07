import Link from "next/link";
import { exigirSessao } from "@/lib/permissoes";
import { signOut } from "@/auth";

/**
 * Ecrã provisório: prova que o login, a sessão e o logout funcionam.
 * Nas próximas fases, cada perfil vai ter aqui atalhos para o que lhe
 * interessa (porteiro -> ecrã da portaria, admin -> administração, etc.).
 */
export default async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const sessao = await exigirSessao();
  const { erro } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">Painel</h1>

      {erro === "sem-permissao" && (
        <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Não tens permissão para aceder a essa página.
        </p>
      )}

      <p>
        Sessão iniciada como <strong>{sessao.user.name}</strong> (
        {sessao.user.perfil})
      </p>

      {(sessao.user.perfil === "porteiro" || sessao.user.perfil === "admin") && (
        <Link
          href="/portaria"
          className="rounded border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          Ir para a portaria
        </Link>
      )}

      {/* Assiduidade: só coordenador e admin. O porteiro identifica quem
       * passa na portaria, mas não acompanha o histórico de faltas. */}
      {(sessao.user.perfil === "coordenador" || sessao.user.perfil === "admin") && (
        <Link
          href="/consultas"
          className="rounded border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          Consultar assiduidade
        </Link>
      )}

      {["professor", "dt", "coordenador", "admin"].includes(sessao.user.perfil) && (
        <Link
          href="/horarios"
          className="rounded border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          Horário de turmas
        </Link>
      )}

      {sessao.user.perfil === "admin" && (
        <Link
          href="/admin"
          className="rounded border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          Administração
        </Link>
      )}

      {sessao.user.perfil === "aluno" && (
        <Link
          href="/area-pessoal"
          className="rounded border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          A minha área (código QR, horário e assiduidade)
        </Link>
      )}

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="rounded border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          Terminar sessão
        </button>
      </form>
    </main>
  );
}
