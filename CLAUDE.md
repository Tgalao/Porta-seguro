@AGENTS.md

# PortãoSeguro — contexto do projeto

Sistema de registo de entradas e saídas escolares. Projeto individual da
UFCD 10790 (Projeto de Programação), curso profissional de programação,
3.º ano. O aluno vai ter de **defender este código oralmente** — por isso
tudo tem de ser explicável em português simples, sem "magia" que ele não
consiga justificar.

O enunciado completo (requisitos funcionais/não funcionais, casos de uso,
fluxogramas, modelo de dados, wireframes) está em
`C:\Users\tseab\Desktop\PortaoSeguro_Sessao4.pdf`. Essa fase de análise
está fechada — não voltar a gerar documentação/diagramas a menos que
explicitamente pedido.

## Como o aluno quer trabalhar (regras fixas, não negociáveis sem perguntar)

- Uma fase de cada vez. No fim de cada fase, parar, explicar o que foi
  feito, e esperar OK antes de avançar.
- Explicar decisões técnicas em português simples — o aluno vai ter de
  defender isto oralmente.
- Nunca inventar credenciais/chaves. Variáveis de ambiente novas vão para
  `.env.example` com instruções de onde as obter; o aluno preenche o
  `.env.local` (nunca commitado).
- Código comentado em português de Portugal, interface toda em português.
- Comentários só quando o "porquê" não é óbvio (constrangimento escondido,
  invariante subtil, contorno a um bug/limitação de uma biblioteca) —
  nunca "o quê" (isso o código já diz).
- Commits pequenos, um por peça lógica, mensagem clara.
- Antes de dar uma fase por terminada: correr sempre `npm run typecheck`
  e `npm run lint`, e sempre que possível provar o código a sério (rotas
  de verificação temporárias que criam/apagam dados reais no Atlas, ou
  pedidos HTTP reais com curl) — não basta compilar.

## Stack (fixa, só mudar se o aluno pedir)

Next.js 16 (App Router) + React 19 + TypeScript, `src/` dir. MongoDB Atlas
+ Mongoose. Auth.js v5 (beta) — credenciais + Google. `@node-rs/argon2`
para hash de passwords. Tailwind CSS v4 com modo escuro. `qrcode` /
`html5-qrcode` (ainda por instalar, Fase 5). Deploy final: Vercel + GitHub.
Testes: Vitest (a instalar na Fase 3).

## Estado atual: Fases 0, 1 e 2 concluídas e testadas

**Fase 0 — setup + ligação à BD.** `src/lib/mongoose.ts` (ligação com
cache em variável global — obrigatório em serverless, senão esgota o
limite de ligações do Atlas), `src/lib/datas.ts` (tudo em UTC na BD,
convertido para `Europe/Lisbon` na apresentação e nas comparações com
horários). Rota `/api/saude` para diagnóstico.

**Fase 1 — modelos Mongoose.** As 7 coleções em `src/models/`: Utilizador,
Curso, Turma, Horario, Registo, TokenQR, Ocorrencia. Valores fixos
(`perfil`, `tipo`, `metodo`, `estado`, `tipoOcorrencia`) centralizados em
`src/lib/constantes.ts`. Pontos a saber:
- Nome da coleção passado explicitamente a `mongoose.model(...)` — a
  pluralização automática do Mongoose (pensada para inglês) estragava
  nomes portugueses (ex.: "utilizador" → "utilizadors").
- `Utilizador.palavraPasse` tem `select: false` — nunca vem numa consulta
  normal, só quando pedido explicitamente (`.select("+palavraPasse")`).
- **Decisão do aluno**: acrescentado `fotoUrl` (opcional) a Utilizador —
  não estava no modelo de dados da análise, mas é preciso para a portaria
  mostrar a foto do aluno junto ao semáforo. Quando não há foto, mostrar
  iniciais num círculo.
- **Correção ao enunciado**: acrescentado o perfil `"porteiro"` à lista de
  perfis — a tabela do PDF não o tinha, mas é o utilizador principal do
  ecrã da portaria.
- Índices pensados para as consultas reais: `horarios` por
  `turmaId+diaSemana`, `registos` por `alunoId+dataHora` (mais recente
  primeiro), `tokensQR` por `alunoId+usado`.

**Fase 2 — autenticação.** Testada de ponta a ponta com pedidos HTTP reais
(CSRF, cookies, login, sessão, logout) contra o Atlas real — não só
`tsc`/`eslint`. Pontos importantes:
- `src/lib/senha.ts` — Argon2id via `@node-rs/argon2`. O valor do
  algoritmo é escrito como número literal (`2`), não importado como
  `enum`, porque o Next.js compila cada ficheiro isoladamente
  (`isolatedModules`) e isso não é compatível com `const enum`.
- `src/auth.config.ts` (sem fornecedores, "leve") vs `src/auth.ts`
  (Credentials + Google, completo) — divididos porque o Credentials usa
  Argon2id (módulo nativo) e Mongoose (TCP), que só correm em runtime
  Node.js.
- `src/proxy.ts` — **não `middleware.ts`**: no Next.js 16 essa convenção
  passou a chamar-se "proxy". Descoberto porque o servidor recusava
  arrancar; a causa raiz foi confirmada na própria fonte do Next.js, não
  adivinhada.
- Aumentação de tipos do JWT (`src/types/next-auth.d.ts`) tem de visar
  `declare module "@auth/core/jwt"` — **não** `"next-auth/jwt"` (que é só
  um re-export e a augmentation aí não chega aos callbacks internos).
- Login por Google nunca cria contas sozinho: só entra quem já tiver um
  `Utilizador` criado na escola com esse email (`signIn` callback em
  `auth.ts`). O Google confirma identidade; quem pode usar o sistema é
  sempre decisão nossa.
- `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` já estão preenchidos no
  `.env.local` do aluno. Falta: (1) acrescentar o email de teste em
  Google Auth Platform → Audience → Test users (a app está em modo de
  teste), (2) haver um `Utilizador` com esse email na BD para o `signIn`
  callback deixar entrar — isso só vai existir a partir da Fase 6 (seed)
  ou Fase 8 (CRUD).

## Decisões ainda pendentes de confirmação com o aluno

- Exportação de relatórios (Fase 7): proposto CSV (sem dependências
  novas). A confirmar quando lá chegarmos.
- Testes: proposto Vitest (não estava na stack original, mas foi aceite
  implicitamente ao avançar).

## Avisos sobre o ambiente local (para não repetir o incidente desta sessão)

O aluno usa o GitHub Desktop e teve várias confusões a mover/arrastar a
pasta do projeto manualmente (nested folders, pastas vazias, nomes
trocados). **O projeto pode não estar sempre no mesmo sítio entre
sessões** — confirmar sempre com `git log --oneline | wc -l` que o
histórico tem os commits esperados antes de assumir que uma pasta é a
correta. Existe um backup zip em
`C:\Users\tseab\Desktop\portaoseguro-backup.zip` (código + histórico
git completo, sem `node_modules`/`.next`) como rede de segurança.

Antes de qualquer operação destrutiva em pastas/ficheiros fora do
`node_modules`/`.next`/`dev.log` do próprio projeto, perguntar primeiro.

## Próxima fase: Fase 3 — lógica de decisão + testes

A parte mais importante para a nota. Funções puras em `src/lib/regras/`
(sem BD, sem rede):
- `decidirSaida(aluno, horariosDaTurma, momento)` → autorizado/
  não autorizado + motivo. Autorizada se: não há bloco de horário a
  decorrer, OU aluno é maior de idade, OU tem `autorizacaoPais`.
- `decidirEntrada(aluno, horariosDaTurma, momento)` → bloqueio se
  suspenso (+ ocorrência), senão entrada com/sem atraso.
- `validarTokenQR(token, alunoIdQueApresenta, momento)` → válido/
  expirado/já usado/de outro aluno.

Instalar Vitest, escrever testes unitários com casos-fronteira (hora
exata de início/fim de bloco, exatamente aos 2 minutos do token, etc.).

## Depois da Fase 3 (ordem acordada)

4. Ecrã da portaria (leitor de cartão, semáforo, tabela do dia)
5. QR dinâmico (gerar + ler câmara)
6. Script de seed (2 cursos, 4 turmas, ~20 alunos, horários de 1 semana,
   alguns registos)
7. Consultas e relatórios (presenças/faltas/atrasos sempre derivados dos
   registos + horários, nunca introduzidos à mão)
8. Administração (CRUD alunos/turmas/cursos/horários)
9. Deploy (Vercel + GitHub; nessa altura acrescentar o URL de produção
   como segundo "Authorized redirect URI" no cliente Google — não é
   preciso recriar o cliente)
