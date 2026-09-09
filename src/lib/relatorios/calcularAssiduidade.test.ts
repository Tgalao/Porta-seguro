import { describe, expect, it } from "vitest";
import { calcularAssiduidade, type RegistoParaAssiduidade } from "./calcularAssiduidade";

// Semana de 5 a 11 de janeiro de 2026 (segunda a domingo). Janeiro em
// Lisboa está em UTC+0, tal como nos outros testes deste projeto.
const HORARIOS_SEG_QUA_SEX = [{ diaSemana: 1 }, { diaSemana: 3 }, { diaSemana: 5 }];
const PERIODO_SEMANA = {
  inicio: new Date("2026-01-05T00:00:00.000Z"),
  fim: new Date("2026-01-12T00:00:00.000Z"),
};

function entradaAutorizada(dataHoraISO: string, comAtraso = false): RegistoParaAssiduidade {
  return {
    tipo: "entrada",
    estado: "autorizado",
    dataHora: new Date(dataHoraISO),
    horarioId: comAtraso ? "000000000000000000000001" : undefined,
  };
}

describe("calcularAssiduidade", () => {
  it("conta só os dias em que a turma tem aula", () => {
    const resultado = calcularAssiduidade(HORARIOS_SEG_QUA_SEX, [], PERIODO_SEMANA);
    expect(resultado.diasLetivos).toBe(3); // segunda, quarta e sexta
  });

  it("marca falta quando não há entrada autorizada num dia letivo", () => {
    const resultado = calcularAssiduidade(HORARIOS_SEG_QUA_SEX, [], PERIODO_SEMANA);
    expect(resultado.faltas).toBe(3);
    expect(resultado.presencas).toBe(0);
  });

  it("marca presença sem atraso quando a entrada não tem horarioId", () => {
    const registos = [entradaAutorizada("2026-01-05T08:00:00.000Z")]; // segunda
    const resultado = calcularAssiduidade(HORARIOS_SEG_QUA_SEX, registos, PERIODO_SEMANA);
    expect(resultado.presencas).toBe(1);
    expect(resultado.atrasos).toBe(0);
    expect(resultado.faltas).toBe(2);
  });

  it("marca presença COM atraso quando a entrada tem horarioId", () => {
    const registos = [entradaAutorizada("2026-01-07T09:15:00.000Z", true)]; // quarta
    const resultado = calcularAssiduidade(HORARIOS_SEG_QUA_SEX, registos, PERIODO_SEMANA);
    expect(resultado.presencas).toBe(1);
    expect(resultado.atrasos).toBe(1);
  });

  it("conta como falta uma entrada bloqueada por suspensão (não autorizada)", () => {
    const registos: RegistoParaAssiduidade[] = [
      {
        tipo: "entrada",
        estado: "nao_autorizado",
        dataHora: new Date("2026-01-05T08:00:00.000Z"),
      },
    ];
    const resultado = calcularAssiduidade(HORARIOS_SEG_QUA_SEX, registos, PERIODO_SEMANA);
    expect(resultado.faltas).toBe(3);
  });

  it("fronteira: um registo exatamente à meia-noite do dia seguinte não conta para o dia anterior", () => {
    const registos = [entradaAutorizada("2026-01-06T00:00:00.000Z")]; // terça à meia-noite, não é dia letivo
    const resultado = calcularAssiduidade(HORARIOS_SEG_QUA_SEX, registos, PERIODO_SEMANA);
    // A entrada cai fora dos três dias letivos (seg/qua/sex) — continuam todos em falta.
    expect(resultado.faltas).toBe(3);
  });

  it("taxaPresenca é 0 (não NaN) quando não há nenhum dia letivo no período", () => {
    const resultado = calcularAssiduidade([], [], PERIODO_SEMANA);
    expect(resultado.diasLetivos).toBe(0);
    expect(resultado.taxaPresenca).toBe(0);
  });

  it("guarda a hora exata da entrada num dia de presença, e nenhuma numa falta", () => {
    const registos = [
      entradaAutorizada("2026-01-05T08:12:00.000Z"), // segunda: presença às 08:12
      // quarta: sem registo -> falta, sem hora
    ];
    const resultado = calcularAssiduidade(HORARIOS_SEG_QUA_SEX, registos, PERIODO_SEMANA);
    const segunda = resultado.dias.find((d) => d.data.toISOString() === "2026-01-05T00:00:00.000Z");
    const quarta = resultado.dias.find((d) => d.data.toISOString() === "2026-01-07T00:00:00.000Z");
    expect(segunda?.horaEntrada?.toISOString()).toBe("2026-01-05T08:12:00.000Z");
    expect(quarta?.horaEntrada).toBeUndefined();
  });

  it("calcula a taxa de presença corretamente com presenças e faltas misturadas", () => {
    const registos = [
      entradaAutorizada("2026-01-05T08:00:00.000Z"), // segunda: presença
      entradaAutorizada("2026-01-07T09:15:00.000Z", true), // quarta: presença c/ atraso
      // sexta: sem registo -> falta
    ];
    const resultado = calcularAssiduidade(HORARIOS_SEG_QUA_SEX, registos, PERIODO_SEMANA);
    expect(resultado.presencas).toBe(2);
    expect(resultado.faltas).toBe(1);
    expect(resultado.taxaPresenca).toBeCloseTo(2 / 3);
  });
});
