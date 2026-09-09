/**
 * Rota de diagnóstico: GET /api/saude
 *
 * Serve para confirmar que a aplicação consegue mesmo falar com o MongoDB
 * Atlas. Não faz parte dos requisitos do projeto — é uma ferramenta de apoio
 * ao desenvolvimento, útil também para verificar o deploy na Vercel.
 */

import { ligarBaseDados } from "@/lib/mongoose";
import { formatarDataHora } from "@/lib/datas";
import { auth } from "@/auth";

// Esta rota TEM de correr no runtime Node.js. O Mongoose usa sockets TCP,
// que não existem no runtime "Edge" da Vercel.
export const runtime = "nodejs";

// Nunca guardar o resultado em cache: queremos sempre o estado atual.
export const dynamic = "force-dynamic";

export async function GET() {
  const agora = new Date();

  // Esta rota tem de continuar a responder a quem não tem sessão — é assim
  // que se confirma que um deploy novo ficou de pé. Mas o nome da base de
  // dados e o endereço do servidor no Atlas não são coisas para dar a
  // desconhecidos: os detalhes só vão para um admin autenticado.
  const sessao = await auth();
  const eAdmin = sessao?.user?.perfil === "admin" || sessao?.user?.perfil === "gestor";

  try {
    const ligacao = await ligarBaseDados();

    if (!eAdmin) {
      return Response.json({ estado: "ok" });
    }

    return Response.json({
      estado: "ok",
      baseDados: ligacao.connection.name, // nome da base de dados ligada
      servidor: ligacao.connection.host,
      momento: formatarDataHora(agora), // já no fuso de Lisboa
    });
  } catch (erro) {
    // A mensagem crua do driver do MongoDB ajuda a perceber o que falhou
    // (URI em falta, password errada, IP não autorizado no Atlas...), mas
    // também revela demasiado — fica no log do servidor e só é devolvida a
    // um admin.
    console.error("Falha na ligação à base de dados:", erro);
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido.";

    return Response.json(
      {
        estado: "erro",
        ...(eAdmin ? { mensagem, momento: formatarDataHora(agora) } : {}),
      },
      { status: 500 },
    );
  }
}
