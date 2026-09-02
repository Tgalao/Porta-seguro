import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import type { IHorario } from "@/models/Horario";
import { decidirEntrada } from "./decidirEntrada";

// Ver decidirSaida.test.ts: janeiro em Lisboa está em UTC+0, por isso a
// hora UTC usada aqui coincide com a hora de Lisboa.
function segundaFeira(hora: string): Date {
  const [h, m] = hora.split(":").map(Number);
  return new Date(Date.UTC(2026, 0, 5, h, m));
}

const blocoMatematica: IHorario = {
  _id: new Types.ObjectId(),
  turmaId: new Types.ObjectId(),
  diaSemana: 1, // segunda-feira
  horaInicio: "08:30",
  horaFim: "10:00",
  disciplina: "Matemática",
};

const alunoNormal = { suspenso: false };
const alunoSuspenso = { suspenso: true };

describe("decidirEntrada", () => {
  it("bloqueia sempre a entrada de um aluno suspenso e assinala para gerar ocorrência", () => {
    const decisao = decidirEntrada(alunoSuspenso, [blocoMatematica], segundaFeira("08:00"));
    expect(decisao.autorizado).toBe(false);
    expect(decisao.criarOcorrencia).toBe(true);
  });

  it("autoriza sem atraso quando não há nenhuma aula a decorrer", () => {
    const decisao = decidirEntrada(alunoNormal, [blocoMatematica], segundaFeira("08:00"));
    expect(decisao.autorizado).toBe(true);
    expect(decisao.comAtraso).toBe(false);
  });

  it("autoriza com atraso quando já decorre uma aula da turma", () => {
    const decisao = decidirEntrada(alunoNormal, [blocoMatematica], segundaFeira("09:00"));
    expect(decisao.autorizado).toBe(true);
    expect(decisao.comAtraso).toBe(true);
    expect(decisao.horarioId).toBe(blocoMatematica._id);
  });

  it("fronteira: com atraso exatamente na hora de início do bloco", () => {
    const decisao = decidirEntrada(alunoNormal, [blocoMatematica], segundaFeira("08:30"));
    expect(decisao.comAtraso).toBe(true);
  });

  it("fronteira: sem atraso exatamente na hora de fim do bloco (já terminou)", () => {
    const decisao = decidirEntrada(alunoNormal, [blocoMatematica], segundaFeira("10:00"));
    expect(decisao.comAtraso).toBe(false);
  });
});
