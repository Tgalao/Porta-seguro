/**
 * Exportação do relatório de assiduidade em PDF (RF11 / UC04).
 *
 * É uma rota normal (não uma Server Action) de propósito: uma Server
 * Action devolve dados para o React tratar, não um ficheiro para
 * descarregar — um `<a href="/api/relatorios/pdf?...">` é a forma direta
 * de o browser fazer o download, sem código extra nenhum no cliente.
 *
 * Só a administração gera relatórios (UC04: "Atores: Administração").
 */
import { exigirPerfil } from "@/lib/permissoes";
import { calcularResultadoConsulta, type Ambito } from "@/app/consultas/logica";
import { gerarPDFRelatorio } from "./gerarPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await exigirPerfil(["admin"]);

  const { searchParams } = new URL(request.url);
  const ambito = searchParams.get("ambito") as Ambito | null;
  const alvo = searchParams.get("alvo");
  const mes = searchParams.get("mes");

  if (!ambito || !alvo || !mes || !/^\d{4}-\d{2}$/.test(mes)) {
    return new Response("Parâmetros em falta ou inválidos.", { status: 400 });
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
