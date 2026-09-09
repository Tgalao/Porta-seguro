/**
 * Exportação do relatório de assiduidade em PDF (RF11 / UC04).
 *
 * É uma rota normal (não uma Server Action) de propósito: uma Server
 * Action devolve dados para o React tratar, não um ficheiro para
 * descarregar — um `<a href="/api/relatorios/pdf?...">` é a forma direta
 * de o browser fazer o download, sem código extra nenhum no cliente.
 *
 * Só quem consulta assiduidade gera relatórios: admin e coordenador (UC04).
 * O ficheiro é gerado a partir dos mesmos dados que a pessoa já vê no ecrã
 * de consultas, e passa pela mesma verificação de âmbito — senão bastava
 * trocar o `alvo` no endereço para descarregar dados de outra turma.
 */
import { exigirPerfil } from "@/lib/permissoes";
import { calcularResultadoConsulta, podeConsultar, ambitoValido } from "@/app/consultas/logica";
import { gerarPDFRelatorio } from "./gerarPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sessao = await exigirPerfil(["coordenador", "gestor", "admin"]);

  const { searchParams } = new URL(request.url);
  const ambito = searchParams.get("ambito");
  const alvo = searchParams.get("alvo");
  const mes = searchParams.get("mes");

  if (!ambitoValido(ambito) || !alvo || !mes || !/^\d{4}-\d{2}$/.test(mes)) {
    return new Response("Parâmetros em falta ou inválidos.", { status: 400 });
  }

  if (!(await podeConsultar(sessao.user.id, sessao.user.perfil, ambito, alvo))) {
    return new Response("Não tens acesso a esses dados.", { status: 403 });
  }

  const resultado = await calcularResultadoConsulta(ambito, alvo, mes);
  if (!resultado.ok) {
    return new Response(resultado.erro, { status: 404 });
  }

  const bytesPDF = await gerarPDFRelatorio(resultado, mes);

  return new Response(new Uint8Array(bytesPDF), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="assiduidade-${ambito}-${mes}.pdf"`,
    },
  });
}
