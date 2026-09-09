import { describe, expect, it } from "vitest";
import { diaSemanaDeTexto, interpretarLinhasExcel } from "./importarHorario";

const PROFESSORES = [
  { id: "p1", nome: "Ana Ferreira" },
  { id: "p2", nome: "Bruno Costa" },
];

describe("diaSemanaDeTexto", () => {
  it("aceita o nome do dia com e sem acento/maiúsculas", () => {
    expect(diaSemanaDeTexto("Segunda-feira")).toBe(1);
    expect(diaSemanaDeTexto("terça")).toBe(2);
    expect(diaSemanaDeTexto("TERCA")).toBe(2);
    expect(diaSemanaDeTexto("sexta-feira")).toBe(5);
  });

  it("aceita o número do dia", () => {
    expect(diaSemanaDeTexto("3")).toBe(3);
    expect(diaSemanaDeTexto("0")).toBe(0);
  });

  it("devolve undefined para texto não reconhecido", () => {
    expect(diaSemanaDeTexto("qualquer coisa")).toBeUndefined();
    expect(diaSemanaDeTexto("8")).toBeUndefined();
  });
});

describe("interpretarLinhasExcel", () => {
  it("interpreta uma linha válida, resolvendo o professor pelo nome", () => {
    const resultado = interpretarLinhasExcel(
      [
        {
          Dia: "Segunda-feira",
          Início: "08:30",
          Fim: "10:00",
          Disciplina: "Programação",
          Professor: "Ana Ferreira",
          Sala: "Sala 101",
        },
      ],
      PROFESSORES,
    );

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      numeroLinha: 2,
      diaSemana: 1,
      horaInicio: "08:30",
      horaFim: "10:00",
      disciplina: "Programação",
      professorId: "p1",
      sala: "Sala 101",
      erros: [],
    });
  });

  it("aceita cabeçalhos sem acento e com outra capitalização", () => {
    const resultado = interpretarLinhasExcel(
      [{ dia: "3", inicio: "13:00", fim: "14:30", DISCIPLINA: "Base de Dados" }],
      PROFESSORES,
    );
    expect(resultado[0].erros).toEqual([]);
    expect(resultado[0].diaSemana).toBe(3);
  });

  it("assinala hora em falta ou mal formatada", () => {
    const resultado = interpretarLinhasExcel(
      [{ Dia: "Segunda", Início: "8h30", Fim: "10:00", Disciplina: "X" }],
      PROFESSORES,
    );
    expect(resultado[0].erros).toContain('"Início" tem de estar no formato HH:MM.');
  });

  it("assinala fim antes ou igual ao início", () => {
    const resultado = interpretarLinhasExcel(
      [{ Dia: "Segunda", Início: "10:00", Fim: "10:00", Disciplina: "X" }],
      PROFESSORES,
    );
    expect(resultado[0].erros).toContain('"Fim" tem de ser depois de "Início".');
  });

  it("assinala professor que não corresponde a nenhuma conta", () => {
    const resultado = interpretarLinhasExcel(
      [{ Dia: "Segunda", Início: "08:30", Fim: "10:00", Disciplina: "X", Professor: "Alguém Estranho" }],
      PROFESSORES,
    );
    expect(resultado[0].erros).toContain(
      'Professor "Alguém Estranho" não encontrado (o nome tem de ser igual ao da conta).',
    );
  });

  it("não obriga a coluna Professor nem Sala — ficam por preencher sem erro", () => {
    const resultado = interpretarLinhasExcel(
      [{ Dia: "Segunda", Início: "08:30", Fim: "10:00", Disciplina: "X" }],
      PROFESSORES,
    );
    expect(resultado[0].erros).toEqual([]);
    expect(resultado[0].professorId).toBeUndefined();
    expect(resultado[0].sala).toBeUndefined();
  });

  it("numera as linhas a partir da 2 (a 1 é o cabeçalho no Excel original)", () => {
    const resultado = interpretarLinhasExcel(
      [
        { Dia: "Segunda", Início: "08:30", Fim: "10:00", Disciplina: "A" },
        { Dia: "Terça", Início: "08:30", Fim: "10:00", Disciplina: "B" },
      ],
      PROFESSORES,
    );
    expect(resultado[0].numeroLinha).toBe(2);
    expect(resultado[1].numeroLinha).toBe(3);
  });
});
