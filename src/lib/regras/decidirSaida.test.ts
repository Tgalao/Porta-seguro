import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import type { IHorario } from "@/models/Horario";
import { decidirSaida } from "./decidirSaida";

// Segunda-feira, 5 de janeiro de 2026. Em janeiro Lisboa está em UTC+0
// (sem hora de verão), por isso a hora UTC usada aqui coincide com a hora
// de Lisboa — evita ambiguidade nos testes.
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

const alunoMenorSemAutorizacao = { maiorIdade: false, autorizacaoPais: false };
const alunoMaiorIdade = { maiorIdade: true, autorizacaoPais: false };
const alunoMenorComAutorizacao = { maiorIdade: false, autorizacaoPais: true };

describe("decidirSaida", () => {
  it("autoriza a saída quando não há nenhuma aula a decorrer", () => {
    const decisao = decidirSaida(alunoMenorSemAutorizacao, [blocoMatematica], segundaFeira("08:00"));
    expect(decisao.autorizado).toBe(true);
  });

  it("recusa a saída de um aluno menor, sem autorização dos pais, a meio de uma aula", () => {
    const decisao = decidirSaida(alunoMenorSemAutorizacao, [blocoMatematica], segundaFeira("09:00"));
    expect(decisao.autorizado).toBe(false);
    expect(decisao.horarioId).toBe(blocoMatematica._id);
  });

  it("autoriza a saída de um aluno maior de idade, mesmo a meio de uma aula", () => {
    const decisao = decidirSaida(alunoMaiorIdade, [blocoMatematica], segundaFeira("09:00"));
    expect(decisao.autorizado).toBe(true);
  });

  it("autoriza a saída de um aluno menor com autorização dos pais, a meio de uma aula", () => {
    const decisao = decidirSaida(alunoMenorComAutorizacao, [blocoMatematica], segundaFeira("09:00"));
    expect(decisao.autorizado).toBe(true);
  });

  it("fronteira: recusa exatamente na hora de início do bloco (aula já começou)", () => {
    const decisao = decidirSaida(alunoMenorSemAutorizacao, [blocoMatematica], segundaFeira("08:30"));
    expect(decisao.autorizado).toBe(false);
  });

  it("fronteira: autoriza exatamente na hora de fim do bloco (aula já terminou)", () => {
    const decisao = decidirSaida(alunoMenorSemAutorizacao, [blocoMatematica], segundaFeira("10:00"));
    expect(decisao.autorizado).toBe(true);
  });
});
