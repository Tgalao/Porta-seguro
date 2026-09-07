import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import type { IHorario } from "@/models/Horario";
import { calcularEstadoPorta } from "./estadoPorta";

// Janeiro em Lisboa está em UTC+0, por isso a hora UTC coincide com a de
// Lisboa (mesma convenção dos outros testes das regras).
function segundaFeira(hora: string): Date {
  const [h, m] = hora.split(":").map(Number);
  return new Date(Date.UTC(2026, 0, 5, h, m));
}

function bloco(diaSemana: number, horaInicio: string, horaFim: string, disciplina: string): IHorario {
  return {
    _id: new Types.ObjectId(),
    turmaId: new Types.ObjectId(),
    diaSemana,
    horaInicio,
    horaFim,
    disciplina,
  };
}

// Segunda-feira: 08:30-10:00 e 10:15-11:45 (com um intervalo de 15 min).
const manha = bloco(1, "08:30", "10:00", "Programação");
const meio = bloco(1, "10:15", "11:45", "Base de Dados");
const horarioSegunda = [manha, meio];

describe("calcularEstadoPorta", () => {
  it("fecha a porta quando a turma não tem aulas nesse dia da semana", () => {
    // Domingo (dia 4 de janeiro de 2026) — o horário só tem blocos à segunda.
    const domingo = new Date(Date.UTC(2026, 0, 4, 9, 0));
    const resultado = calcularEstadoPorta(horarioSegunda, domingo);

    expect(resultado.estado).toBe("fechada");
    expect(resultado.atrasado).toBe(false);
  });

  it("fecha a porta quando a turma não tem horário nenhum", () => {
    expect(calcularEstadoPorta([], segundaFeira("09:00")).estado).toBe("fechada");
  });

  it("abre a porta e marca atraso quando já decorre uma aula", () => {
    const resultado = calcularEstadoPorta(horarioSegunda, segundaFeira("09:00"));

    expect(resultado.estado).toBe("aberta");
    expect(resultado.atrasado).toBe(true);
    expect(resultado.motivo).toContain("Programação");
  });

  it("abre a porta sem atraso antes de começar a primeira aula", () => {
    const resultado = calcularEstadoPorta(horarioSegunda, segundaFeira("08:00"));

    expect(resultado.estado).toBe("aberta");
    expect(resultado.atrasado).toBe(false);
    expect(resultado.motivo).toContain("08:30");
  });

  it("abre a porta sem atraso no intervalo entre dois blocos", () => {
    const resultado = calcularEstadoPorta(horarioSegunda, segundaFeira("10:05"));

    expect(resultado.estado).toBe("aberta");
    expect(resultado.atrasado).toBe(false);
    expect(resultado.motivo).toContain("Intervalo");
  });

  it("fecha a porta depois de terminar o último bloco do dia", () => {
    const resultado = calcularEstadoPorta(horarioSegunda, segundaFeira("12:00"));

    expect(resultado.estado).toBe("fechada");
    expect(resultado.atrasado).toBe(false);
  });

  // Casos-fronteira: os minutos exatos de início e fim.
  it("no minuto exato de início da aula já conta como atraso", () => {
    const resultado = calcularEstadoPorta(horarioSegunda, segundaFeira("08:30"));
    expect(resultado.atrasado).toBe(true);
  });

  it("no minuto exato de fim do último bloco a porta já está fechada", () => {
    const resultado = calcularEstadoPorta([manha], segundaFeira("10:00"));
    expect(resultado.estado).toBe("fechada");
  });

  it("no minuto exato em que acaba um bloco mas ainda falta outro, fica em intervalo", () => {
    const resultado = calcularEstadoPorta(horarioSegunda, segundaFeira("10:00"));
    expect(resultado.estado).toBe("aberta");
    expect(resultado.atrasado).toBe(false);
  });

  it("respeita a hora de Lisboa no verão (UTC+1), não a hora UTC", () => {
    // 6 de julho de 2026 é uma segunda-feira. 08:00 UTC = 09:00 em Lisboa,
    // ou seja, já com a aula das 08:30 a decorrer.
    const julho = new Date(Date.UTC(2026, 6, 6, 8, 0));
    const resultado = calcularEstadoPorta(horarioSegunda, julho);

    expect(resultado.estado).toBe("aberta");
    expect(resultado.atrasado).toBe(true);
  });
});
