/**
 * Ligação à base de dados MongoDB Atlas através do Mongoose.
 *
 * PORQUÊ ESTE FICHEIRO É ASSIM (importante para a defesa oral):
 *
 * O projeto vai ser publicado na Vercel, que corre em modo "serverless".
 * Isso quer dizer que o servidor não está sempre ligado: a cada pedido pode
 * ser criada uma nova instância do nosso código. Se abríssemos uma ligação
 * nova ao MongoDB em cada pedido, em poucos minutos esgotávamos o limite de
 * ligações do plano gratuito do Atlas e a aplicação deixava de responder.
 *
 * A solução é guardar a ligação (e a promessa de ligação) numa variável
 * GLOBAL. Em Node.js, o objeto `global` sobrevive entre pedidos que reutilizem
 * a mesma instância, por isso a segunda vez que alguém pedir uma página já
 * encontra a ligação feita e reaproveita-a em vez de abrir outra.
 *
 * Em desenvolvimento resolve outro problema: o Next.js recarrega os módulos
 * sempre que gravamos um ficheiro (hot reload), e sem este cache ficaríamos
 * com dezenas de ligações abertas até o Atlas nos bloquear.
 */

import mongoose, { type Mongoose } from "mongoose";

/** Formato do que guardamos na variável global. */
interface CacheLigacao {
  /** A ligação já estabelecida, ou null se ainda não existir. */
  ligacao: Mongoose | null;
  /** A promessa da ligação em curso, para não iniciar duas ao mesmo tempo. */
  promessa: Promise<Mongoose> | null;
}

// Declaramos a variável global para o TypeScript a conhecer e não dar erro.
declare global {
  var _cacheMongoose: CacheLigacao | undefined;
}

// Se ainda não existir cache global, criamos um vazio.
const cache: CacheLigacao = global._cacheMongoose ?? {
  ligacao: null,
  promessa: null,
};
global._cacheMongoose = cache;

/**
 * Devolve a ligação ao MongoDB, criando-a apenas na primeira vez.
 *
 * Usar sempre esta função (nunca `mongoose.connect` diretamente) em qualquer
 * sítio que precise de aceder à base de dados.
 */
export async function ligarBaseDados(): Promise<Mongoose> {
  // 1.º caso: já existe ligação feita — devolvemos logo, sem custo nenhum.
  if (cache.ligacao) {
    return cache.ligacao;
  }

  // 2.º caso: não há ligação nem sequer uma a ser criada — criamos agora.
  if (!cache.promessa) {
    // Lemos a variável de ambiente aqui dentro (e não no topo do ficheiro)
    // para que o `npm run build` não falhe em máquinas sem o .env definido.
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error(
        "A variável de ambiente MONGODB_URI não está definida. " +
          "Copia o ficheiro .env.example para .env.local e preenche-a.",
      );
    }

    cache.promessa = mongoose.connect(uri, {
      // Evita que o Mongoose guarde comandos em fila enquanto não há ligação:
      // preferimos um erro imediato e claro a um pedido que fica pendurado.
      bufferCommands: false,
    });
  }

  // 3.º caso: há uma ligação a ser criada — esperamos por ela.
  try {
    cache.ligacao = await cache.promessa;
  } catch (erro) {
    // Se falhar, limpamos a promessa para que a próxima tentativa recomece
    // do zero em vez de ficar presa a uma promessa já rejeitada.
    cache.promessa = null;
    throw erro;
  }

  return cache.ligacao;
}
