import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Instância separada do NextAuth, só para este ficheiro: usa a configuração
 * "leve" (sem Credentials nem Google). Ver a explicação completa em
 * src/auth.config.ts.
 *
 * (No Next.js 16 este ficheiro chama-se "proxy.ts" — antes chamava-se
 * "middleware.ts". A partir desta versão corre sempre em runtime Node.js,
 * por isso o cuidado com o Edge deixou de ser obrigatório aqui, mas mantemos
 * a divisão auth.config.ts / auth.ts na mesma, por ser mais seguro e mais
 * fácil de perceber onde é que cada coisa corre.)
 */
const { auth } = NextAuth(authConfig);

// Tem de ser uma variável simples (`export const proxy = ...`), não uma
// desestruturação — o Next.js analisa o ficheiro à procura exatamente deste
// padrão para saber que função executar em cada pedido.
export const proxy = auth;

export const config = {
  matcher: [
    /*
     * Aplica-se a todos os pedidos EXCETO:
     *  - api/auth       -> as próprias rotas do Auth.js (login, callback...)
     *  - api/saude      -> rota de diagnóstico da Fase 0, usada em desenvolvimento
     *  - _next/static   -> ficheiros gerados pelo Next.js
     *  - _next/image    -> otimização de imagens do Next.js
     *  - ficheiros com extensão de imagem/ícone -> tudo o que está em
     *    public/ (ex.: o logótipo da escola no ecrã de login). Sem esta
     *    exceção, um pedido a /logo-escola.png sem sessão era redirecionado
     *    para /login — devolvendo HTML em vez da imagem — precisamente na
     *    única página onde alguém sem sessão está autorizado a estar.
     */
    "/((?!api/auth|api/saude|_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|svg|gif|webp)$).*)",
  ],
};
