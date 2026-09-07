/**
 * Script de seed: preenche a base de dados com dados de demonstração
 * coerentes entre si — 2 cursos, 4 turmas, ~20 alunos, horários de uma
 * semana e alguns registos de entrada/saída.
 *
 * Corre-se com `npm run seed`. APAGA primeiro tudo o que já existir nas 7
 * coleções — é para ambiente de desenvolvimento, nunca para uma base de
 * dados com dados reais de alunos.
 *
 * Todos os utilizadores criados ficam com a mesma palavra-passe, indicada
 * no resumo impresso no fim.
 */

// O Next.js carrega o .env.local sozinho; este script corre fora do
// Next.js (por `tsx`), por isso tem de carregar o ficheiro ele próprio.
// `process.loadEnvFile` é nativo do Node (>= 20.6) — não precisa de mais
// nenhuma dependência só para isto.
process.loadEnvFile(".env.local");

/**
 * TRAVÃO DE SEGURANÇA.
 *
 * Este script apaga as 7 coleções antes de recriar os dados. Enquanto só
 * existiu a base de dados de desenvolvimento isso era inofensivo; a partir
 * do momento em que houver uma base de dados de produção com alunos a
 * sério, um `npm run seed` distraído — ou um `.env.local` onde alguém
 * colou a URI de produção para experimentar uma coisa — apaga tudo, sem
 * forma de voltar atrás (o plano gratuito do Atlas não faz backups).
 *
 * Por isso o comando recusa-se a correr sozinho: é preciso pedir o
 * apagamento explicitamente. Não protege de quem escreve a flag à mesma,
 * mas protege do engano, que é o que realmente acontece.
 */
const CONFIRMACAO = "--apagar-tudo";

if (!process.argv.includes(CONFIRMACAO)) {
  // Mostra QUAL base de dados ia ser apagada — é o que permite dar pelo
  // engano antes de ele acontecer.
  const uri = process.env.MONGODB_URI ?? "";
  const nomeBaseDados = uri.split("/").pop()?.split("?")[0] || "(desconhecida)";

  console.error(
    [
      "",
      "  O seed APAGA tudo o que está na base de dados antes de recriar.",
      `  Base de dados que ia ser apagada: ${nomeBaseDados}`,
      "",
      "  Se é mesmo isso que queres, corre:",
      `      npm run seed -- ${CONFIRMACAO}`,
      "",
    ].join("\n"),
  );
  process.exit(1);
}

import mongoose from "mongoose";
import { Curso, Turma, Horario, Utilizador, Registo, Ocorrencia } from "@/models";
import type { IUtilizador, ICurso, ITurma } from "@/models";
import { hashPassword } from "@/lib/senha";
import type { Perfil } from "@/lib/constantes";

const PALAVRA_PASSE_SEED = "Seed@2026!";

const DISCIPLINAS_API = [
  "Programação",
  "Base de Dados",
  "Redes de Computadores",
  "Sistemas Operativos",
  "Inglês Técnico",
];

const DISCIPLINAS_MEC = [
  "Design Gráfico",
  "Edição de Vídeo",
  "Fotografia Digital",
  "Animação 2D",
  "Inglês Técnico",
];

const NOMES_PROFESSORES = ["Ana Ferreira", "Bruno Costa", "Carla Santos", "Diogo Pereira"];

const NOMES_ALUNOS = [
  "Beatriz Almeida",
  "Rodrigo Silva",
  "Matilde Sousa",
  "Tomás Oliveira",
  "Leonor Rodrigues",
  "Gonçalo Martins",
  "Carolina Jesus",
  "Afonso Pinto",
  "Mariana Carvalho",
  "Duarte Gomes",
  "Inês Ribeiro",
  "Francisco Marques",
  "Sofia Lopes",
  "Vasco Fernandes",
  "Madalena Teixeira",
  "Guilherme Correia",
  "Benedita Cardoso",
  "Simão Mendes",
  "Lara Nunes",
  "Diogo Antunes",
];

function slug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, ".");
}

interface DefinicaoTurma {
  nome: string;
  ano: number;
  curso: ICurso;
  disciplinas: string[];
}

/** Só os campos do aluno de que o resto do script precisa depois de o criar. */
interface AlunoResumoSeed {
  _id: mongoose.Types.ObjectId;
  email: string;
  numeroCartao?: string;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "A variável de ambiente MONGODB_URI não está definida. " +
        "Confirma que o .env.local existe e está preenchido.",
    );
  }

  await mongoose.connect(uri);
  console.log(`Ligado à base de dados "${mongoose.connection.name}".`);

  console.log("A limpar dados existentes...");
  await Promise.all([
    Utilizador.deleteMany({}),
    Curso.deleteMany({}),
    Turma.deleteMany({}),
    Horario.deleteMany({}),
    Registo.deleteMany({}),
    Ocorrencia.deleteMany({}),
  ]);

  const palavraPasse = await hashPassword(PALAVRA_PASSE_SEED);

  function novoUtilizador(
    nomeCompleto: string,
    email: string,
    perfil: Perfil,
    extra: Partial<IUtilizador> = {},
  ) {
    return { nomeCompleto, email, palavraPasse, perfil, ...extra };
  }

  const admin = await Utilizador.create(
    novoUtilizador("Administrador do Sistema", "admin@portaoseguro.pt", "admin"),
  );
  const porteiro = await Utilizador.create(
    novoUtilizador("Porteiro Principal", "porteiro@portaoseguro.pt", "porteiro"),
  );
  const coordenador = await Utilizador.create(
    novoUtilizador("Coordenadora Pedagógica", "coordenador@portaoseguro.pt", "coordenador"),
  );

  const professores = await Utilizador.insertMany(
    NOMES_PROFESSORES.map((nome) =>
      novoUtilizador(nome, `${slug(nome)}@portaoseguro.pt`, "professor"),
    ),
  );

  const cursoAPI = await Curso.create({
    nome: "Técnico de Programação",
    sigla: "API",
    anosDuracao: 3,
    coordenadorId: coordenador._id,
  });
  const cursoMEC = await Curso.create({
    nome: "Técnico de Multimédia",
    sigla: "MEC",
    anosDuracao: 3,
    coordenadorId: coordenador._id,
  });

  coordenador.cursosQueCoordena = [cursoAPI._id, cursoMEC._id];
  await coordenador.save();

  const definicoesTurmas: DefinicaoTurma[] = [
    { nome: "2API", ano: 2, curso: cursoAPI, disciplinas: DISCIPLINAS_API },
    { nome: "3API", ano: 3, curso: cursoAPI, disciplinas: DISCIPLINAS_API },
    { nome: "1MEC", ano: 1, curso: cursoMEC, disciplinas: DISCIPLINAS_MEC },
    { nome: "2MEC", ano: 2, curso: cursoMEC, disciplinas: DISCIPLINAS_MEC },
  ];

  // Um dia "normal" tem só a manhã + o bloco logo a seguir ao almoço
  // (11:45–13:00 já é um intervalo de almoço real). À terça e à quinta o
  // dia estende-se até às 16h/18h — dá dois cenários diferentes para testar
  // saída/entrada à hora de almoço num dia mais comprido, tal como um dia
  // real de aulas com mais horas.
  const BLOCO_MANHA: Array<[string, string]> = [
    ["08:30", "10:00"],
    ["10:15", "11:45"],
  ];
  const BLOCO_TARDE_CURTA: Array<[string, string]> = [["13:00", "14:30"]];
  const BLOCO_TARDE_ATE_16H: Array<[string, string]> = [
    ["13:00", "14:30"],
    ["14:45", "16:15"],
  ];
  const BLOCO_TARDE_ATE_18H: Array<[string, string]> = [
    ["13:00", "14:30"],
    ["14:45", "16:15"],
    ["16:30", "18:00"],
  ];

  const BLOCOS_POR_DIA: Record<number, Array<[string, string]>> = {
    1: [...BLOCO_MANHA, ...BLOCO_TARDE_CURTA], // segunda — dia normal
    2: [...BLOCO_MANHA, ...BLOCO_TARDE_ATE_16H], // terça — sai às 16h
    3: [...BLOCO_MANHA, ...BLOCO_TARDE_CURTA], // quarta — dia normal
    4: [...BLOCO_MANHA, ...BLOCO_TARDE_ATE_18H], // quinta — sai às 18h
    5: [...BLOCO_MANHA, ...BLOCO_TARDE_CURTA], // sexta — dia normal
  };

  const turmasCriadas: ITurma[] = [];
  const alunosPorTurma: AlunoResumoSeed[][] = [];
  let contadorAluno = 0;
  let contadorProfessor = 0;

  for (const def of definicoesTurmas) {
    const dt = await Utilizador.create(
      novoUtilizador(
        `Diretor(a) de Turma ${def.nome}`,
        `dt.${def.nome.toLowerCase()}@portaoseguro.pt`,
        "dt",
      ),
    );

    const turma = await Turma.create({
      nome: def.nome,
      ano: def.ano,
      cursoId: def.curso._id,
      diretorTurmaId: dt._id,
    });
    turmasCriadas.push(turma);

    dt.turmasQueCoordena = [turma._id];
    await dt.save();

    const horariosDaTurma = [];
    for (let diaSemana = 1; diaSemana <= 5; diaSemana++) {
      for (const [indice, [horaInicio, horaFim]] of BLOCOS_POR_DIA[diaSemana].entries()) {
        const professor = professores[contadorProfessor % professores.length];
        contadorProfessor++;
        horariosDaTurma.push({
          turmaId: turma._id,
          diaSemana,
          horaInicio,
          horaFim,
          disciplina: def.disciplinas[(diaSemana + indice) % def.disciplinas.length],
          professorId: professor._id,
          sala: `Sala ${101 + indice}`,
        });
      }
    }
    await Horario.insertMany(horariosDaTurma);

    const alunosDaTurma: AlunoResumoSeed[] = [];
    for (let i = 0; i < 5; i++) {
      const nome = NOMES_ALUNOS[contadorAluno] ?? `Aluno ${contadorAluno + 1}`;
      const numeroAluno = 20001 + contadorAluno;
      // Ano 3 (finalistas): todos maiores de idade, para simplificar a
      // demonstração das saídas fora do horário.
      const maiorIdade = def.ano >= 3 || Math.random() < 0.25;
      const aluno = await Utilizador.create(
        novoUtilizador(nome, `aluno${numeroAluno}@portaoseguro.pt`, "aluno", {
          numeroAluno,
          numeroCartao: String(numeroAluno),
          turmaId: turma._id,
          maiorIdade,
          autorizacaoPais: !maiorIdade && Math.random() < 0.5,
          // Um aluno suspenso por turma, para haver pelo menos um caso a
          // demonstrar o bloqueio de entrada (RF03).
          suspenso: i === 4,
        }),
      );
      alunosDaTurma.push({ _id: aluno._id, email: aluno.email, numeroCartao: aluno.numeroCartao });
      contadorAluno++;
    }
    alunosPorTurma.push(alunosDaTurma);
  }

  const todosAlunos = alunosPorTurma.flat();

  // Alguns registos de exemplo (ontem), para a tabela de consultas não
  // ficar vazia. As presenças/faltas/atrasos nunca são inseridos à mão —
  // isto é só histórico de entradas/saídas, tal como o porteiro produziria.
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);

  function horaOntem(horas: number, minutos: number): Date {
    const data = new Date(ontem);
    data.setHours(horas, minutos, 0, 0);
    return data;
  }

  const registosExemplo = [];
  for (const aluno of todosAlunos.slice(0, 8)) {
    registosExemplo.push({
      alunoId: aluno._id,
      dataHora: horaOntem(8, 32),
      tipo: "entrada",
      metodo: "cartao",
      estado: "autorizado",
      motivo: "Entrada dentro de horário.",
      registadoPorId: porteiro._id,
    });
    registosExemplo.push({
      alunoId: aluno._id,
      dataHora: horaOntem(17, 5),
      tipo: "saida",
      metodo: "cartao",
      estado: "autorizado",
      motivo: "Fora do horário letivo.",
      registadoPorId: porteiro._id,
    });
  }

  // Um caso de saída negada e um de saída confirmada por telefone, para
  // haver exemplos dos três estados possíveis.
  const [alunoNegado, alunoConfirmadoPais] = todosAlunos.slice(8, 10);
  registosExemplo.push({
    alunoId: alunoNegado._id,
    dataHora: horaOntem(11, 0),
    tipo: "saida",
    metodo: "cartao",
    estado: "nao_autorizado",
    motivo: "Dentro do horário letivo e sem autorização dos pais para sair.",
    registadoPorId: porteiro._id,
  });
  registosExemplo.push({
    alunoId: alunoConfirmadoPais._id,
    dataHora: horaOntem(11, 15),
    tipo: "saida",
    metodo: "cartao",
    estado: "confirmado_pais",
    motivo: "Saída fora do horário confirmada por telefone com os pais.",
    registadoPorId: porteiro._id,
    confirmacaoPais: true,
  });

  await Registo.insertMany(registosExemplo);

  // Ocorrência de exemplo: a tentativa de entrada do aluno suspenso da
  // primeira turma (RF03).
  const alunoSuspenso = alunosPorTurma[0][4];
  const registoBloqueado = await Registo.create({
    alunoId: alunoSuspenso._id,
    dataHora: horaOntem(8, 40),
    tipo: "entrada",
    metodo: "cartao",
    estado: "nao_autorizado",
    motivo: "Aluno suspenso.",
    registadoPorId: porteiro._id,
  });
  await Ocorrencia.create({
    alunoId: alunoSuspenso._id,
    tipo: "entrada_suspenso",
    descricao: "Tentativa de entrada de aluno suspenso.",
    dataHora: horaOntem(8, 40),
    registoId: registoBloqueado._id,
  });

  console.log("\nSemeado com sucesso:");
  console.log(`  Cursos: 2, Turmas: ${turmasCriadas.length}, Alunos: ${todosAlunos.length}`);
  const blocosPorTurma = Object.values(BLOCOS_POR_DIA).reduce(
    (total, blocosDoDia) => total + blocosDoDia.length,
    0,
  );
  console.log(
    `  Professores: ${professores.length}, Horários: ${turmasCriadas.length * blocosPorTurma}`,
  );
  console.log(`  Registos: ${registosExemplo.length + 1}, Ocorrências: 1`);
  console.log("\nContas para experimentar (todas com a mesma palavra-passe):");
  console.log(`  Palavra-passe: ${PALAVRA_PASSE_SEED}`);
  console.log(`  Admin:       ${admin.email}`);
  console.log(`  Porteiro:    ${porteiro.email}`);
  console.log(`  Coordenador: ${coordenador.email}`);
  console.log(`  Aluno (ex.): ${todosAlunos[0].email} (cartão ${todosAlunos[0].numeroCartao})`);

  await mongoose.disconnect();
}

main().catch((erro) => {
  console.error("Falhou:", erro);
  process.exit(1);
});
