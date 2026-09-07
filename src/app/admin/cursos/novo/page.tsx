import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { Utilizador } from "@/models";
import { FormularioCurso } from "../formulario-curso";
import { criarCurso } from "../acoes";
import { LinkVoltar } from "@/components/link-voltar";

export default async function PaginaNovoCurso() {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const coordenadores = await Utilizador.find({ perfil: "coordenador" })
    .select("nomeCompleto")
    .sort({ nomeCompleto: 1 })
    .lean();

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <LinkVoltar href="/admin/cursos" label="Cursos" />
      <h1 className="text-2xl font-bold">Novo curso</h1>
      <FormularioCurso
        acao={criarCurso}
        coordenadores={coordenadores.map((c) => ({ id: c._id.toString(), nome: c.nomeCompleto }))}
      />
    </main>
  );
}
