/**
 * Rota de diagnóstico: GET /api/saude
 *
 * Serve para confirmar que a aplicação consegue mesmo falar com o MongoDB
 * Atlas. Não faz parte dos requisitos do projeto — é uma ferramenta de apoio
 * ao desenvolvimento, útil também para verificar o deploy na Vercel.
 */

import { ligarBaseDados } from "@/lib/mongoose";
import { formatarDataHora } from "@/lib/datas";

// Esta rota TEM de correr no runtime Node.js. O Mongoose usa sockets TCP,
// que não existem no runtime "Edge" da Vercel.
export const runtime = "nodejs";

// Nunca guardar o resultado em cache: queremos sempre o estado atual.
export const dynamic = "force-dynamic";

export async function GET() {
  const agora = new Date();

  try {
    const ligacao = await ligarBaseDados();

    return Response.json({
      estado: "ok",
      baseDados: ligacao.connection.name, // nome da base de dados ligada
      servidor: ligacao.connection.host,
      momento: formatarDataHora(agora), // já no fuso de Lisboa
    });
  } catch (erro) {
    // Devolvemos 500 e a mensagem de erro para ser fácil perceber o que falhou
    // (URI em falta, password errada, IP não autorizado no Atlas, etc.).
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido.";

    return Response.json(
      { estado: "erro", mensagem, momento: formatarDataHora(agora) },
      { status: 500 },
    );
  }
}
