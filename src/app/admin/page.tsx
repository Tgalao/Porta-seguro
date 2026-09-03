import Link from "next/link";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Curso, Turma, Utilizador } from "@/models";
import { LinkVoltarPainel } from "@/components/link-voltar-painel";

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
    <main className="flex flex-1 flex-col gap-6 p-6">
      <LinkVoltarPainel />
      <h1 className="text-2xl font-bold">Administração</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CartaoSeccao href="/admin/cursos" titulo="Cursos" total={totalCursos} />
        <CartaoSeccao href="/admin/turmas" titulo="Turmas" total={totalTurmas} />
        <CartaoSeccao href="/admin/alunos" titulo="Alunos" total={totalAlunos} />
      </div>
    </main>
  );
}

function CartaoSeccao({ href, titulo, total }: { href: string; titulo: string; total: number }) {
  return (
    <Link href={href} className="rounded border p-4 hover:bg-black/5 dark:hover:bg-white/10">
      <p className="text-2xl font-bold">{total}</p>
      <p className="text-sm opacity-70">{titulo}</p>
    </Link>
  );
}
