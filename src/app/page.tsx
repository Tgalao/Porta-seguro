/**
 * Página inicial — provisória.
 *
 * Na Fase 2 este ecrã passa a ser o de início de sessão (email + palavra-passe
 * ou conta Google). Por agora serve apenas para confirmar que o projeto
 * arranca e para dar um atalho ao teste de ligação à base de dados.
 */
export default function PaginaInicial() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">PortãoSeguro</h1>

      <p className="text-sm opacity-70">
        Sistema de registo de entradas e saídas escolares
      </p>

      <p className="mt-4 text-sm">
        Fase 0 concluída: projeto criado e ligação à base de dados preparada.
      </p>

      <a
        href="/api/saude"
        className="rounded border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
      >
        Testar ligação à base de dados
      </a>
    </main>
  );
}
